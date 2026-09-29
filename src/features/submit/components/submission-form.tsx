import { useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import {
  type Control,
  type FieldPath,
  useForm,
  useWatch,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Loader2, Send } from 'lucide-react'
import { getErrorMessage } from '@/lib/handle-server-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCommunes,
  useDistricts,
  useProvinces,
} from '@/features/clients/data/queries'
import { type LocationOption } from '@/features/clients/data/schema'
import {
  MEASURE_KEYS,
  type StockCatalog,
  useStockCatalog,
} from '@/features/stock/data/api'
import {
  type SubmitClientResult,
  getFieldErrors,
  submitClient,
} from '../data/api'
import {
  MAX_FILES,
  PHONE_PATTERN,
  createIdempotencyKey,
  normalizePhone,
} from '../lib/files'
import { type SitePhoto, isSitePhotoReady } from '../lib/site-photo'
import { type Option, OptionCombobox } from './option-combobox'
import { SitePhotos } from './site-photos'

const required = (message: string) => z.string().min(1, message)

const MAX_QUANTITY = 1_000_000

// Untouched boxes have no value at all; blank and untouched both mean 0
const quantity = z
  .string()
  .regex(/^\d*$/, 'លេខគត់ ០ ឡើង · Whole number, 0 or more')
  .refine((v) => v === '' || Number(v) <= MAX_QUANTITY, 'Too large')
  .optional()

const formSchema = z
  .object({
    clientName: z
      .string()
      .transform((value) => value.normalize('NFC').replace(/\s+/g, ' ').trim())
      .refine((value) => [...value].length >= 2, {
        message: 'សូមបញ្ចូលឈ្មោះយ៉ាងហោចណាស់ ២ តួអក្សរ · At least 2 characters',
      }),
    phone: z
      .string()
      .transform(normalizePhone)
      .refine((value) => PHONE_PATTERN.test(value), {
        message: 'លេខទូរស័ព្ទមិនត្រឹមត្រូវ · Use 9–10 digits starting with 0',
      }),
    area: z
      .string()
      .refine((value) => value === 'province' || value === 'capital', {
        message: 'សូមជ្រើសរើស ខេត្ត ឬ ភ្នំពេញ · Choose Province or Phnom Penh',
      }),
    provinceId: required('សូមជ្រើសរើសខេត្ត · Select a province'),
    districtId: required('សូមជ្រើសរើសស្រុក/ខណ្ឌ · Select a district'),
    communeId: required('សូមជ្រើសរើសឃុំ/សង្កាត់ · Select a commune'),
    quantities: z.record(
      z.string(),
      z.object(
        Object.fromEntries(
          MEASURE_KEYS.map((key) => [key, quantity])
        ) as Record<(typeof MEASURE_KEYS)[number], typeof quantity>
      )
    ),
    // Every site photo needs its GPS before the form can be sent
    sitePhotos: z
      .array(z.custom<SitePhoto>())
      .refine((photos) => photos.every(isSitePhotoReady), {
        message:
          'សូមរង់ចាំ GPS ឬលុបរូបថតដែលគ្មានទីតាំង · Wait for GPS, or remove photos without a location',
      }),
    files: z.array(z.instanceof(File)),
  })
  // Site photos and other files together: at least one, within the file limit
  .superRefine((values, ctx) => {
    const total = values.files.length + values.sitePhotos.length
    if (total === 0)
      ctx.addIssue({
        code: 'custom',
        path: ['files'],
        message:
          'សូមថតរូប ឬភ្ជាប់ឯកសារយ៉ាងហោចណាស់ ១ · Take a site photo or attach at least one file',
      })
    else if (total > MAX_FILES)
      ctx.addIssue({
        code: 'custom',
        path: ['files'],
        message: `អតិបរមា ${MAX_FILES} ឯកសារ · Maximum ${MAX_FILES} files in total`,
      })
  })

type FormInput = z.input<typeof formSchema>
type FormOutput = z.output<typeof formSchema>

type Brand = StockCatalog['brands'][number]
type Step = { fields: FieldPath<FormInput>[] } & (
  | { kind: 'details' | 'location' | 'stockPending' | 'photos' }
  | { kind: 'brand'; brand: Brand }
)

/**
 * Details → Location → one step per brand → Photos. Until the catalog has loaded
 * (or if it fails), a placeholder step stands in for the brands and blocks Next.
 */
const buildSteps = (catalog: StockCatalog | undefined): Step[] => [
  { kind: 'details', fields: ['clientName', 'phone'] },
  {
    kind: 'location',
    fields: ['area', 'provinceId', 'districtId', 'communeId'],
  },
  ...(catalog
    ? catalog.brands.map((brand) => ({
        kind: 'brand' as const,
        brand,
        fields: brand.products.flatMap((product) =>
          brand.measures.map(
            (key) => `quantities.${product.id}.${key}` as FieldPath<FormInput>
          )
        ),
      }))
    : [{ kind: 'stockPending' as const, fields: [] }]),
  { kind: 'photos', fields: ['sitePhotos', 'files'] },
]

/** Phnom Penh is the capital; every other entry is a province */
const isCapital = (location: LocationOption) =>
  location.nameKh.includes('ភ្នំពេញ') || /phnom\s*penh/i.test(location.nameEn)

const toLocationOptions = (
  items: LocationOption[] | undefined
): Option[] | undefined =>
  items?.map((item) => ({
    value: item.id,
    label: item.nameKh || item.nameEn,
    description: item.nameKh && item.nameEn ? item.nameEn : undefined,
  }))

const toNumber = (value: string | undefined) => (value ? Number(value) : 0)

/** One brand per step; every quantity is its own full-width row */
function BrandStep({
  brand,
  measures,
  control,
}: {
  brand: Brand
  measures: StockCatalog['measures']
  control: Control<FormInput, unknown, FormOutput>
}) {
  return (
    <div className='grid gap-5'>
      {/* The brand logo is shown in the page header (see onStockStepChange) */}
      <div className='grid min-w-0 gap-0.5'>
        <h3 className='text-base font-semibold text-primary'>
          {brand.nameKh ? `${brand.nameKh} | ${brand.name}` : brand.name}
        </h3>
        <span className='text-xs text-muted-foreground'>
          ស្តុក · Stock — ទុកចន្លោះ = ០ (blank = 0)
        </span>
      </div>
      {brand.products.map((product) => (
        <section key={product.id} className='grid gap-4 rounded-md border p-4'>
          <h4 className='font-medium'>{product.name}</h4>
          {measures.map((measure) => (
            <FormField
              key={measure.key}
              control={control}
              name={
                `quantities.${product.id}.${measure.key}` as FieldPath<FormInput>
              }
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='font-normal'>
                    {measure.kh} {product.name}
                  </FormLabel>
                  <FormControl>
                    <Input
                      inputMode='numeric'
                      pattern='[0-9]*'
                      placeholder='0'
                      autoComplete='off'
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={typeof field.value === 'string' ? field.value : ''}
                      onChange={(e) => field.onChange(e.target.value.trim())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </section>
      ))}
    </div>
  )
}

/** Two-line label: Khmer first, English underneath */
function BilingualLabel({
  kh,
  en,
  required = true,
}: {
  kh: string
  en: string
  required?: boolean
}) {
  return (
    <FormLabel className='flex flex-col items-start gap-0.5'>
      <span>
        {kh} {required && <span className='text-destructive'>*</span>}
      </span>
      <span className='text-xs font-normal text-muted-foreground'>{en}</span>
    </FormLabel>
  )
}

type SubmissionFormProps = {
  onSuccess: (result: SubmitClientResult) => void
  /**
   * Tells the page which stock step is showing, so it can change its heading
   * and show the brand logo: null = not a stock step; brand null = still loading
   */
  onStockStepChange?: (stockStep: StockStep | null) => void
}

export type StockStep = { brand: Brand | null }

export function SubmissionForm({
  onSuccess,
  onStockStepChange,
}: SubmissionFormProps) {
  // One key per filled-in form, so retries and double taps never create duplicates
  const idempotencyKey = useRef(createIdempotencyKey())
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState(0)

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    // Re-check a field as soon as it is left or corrected, so fixed values lose their error
    mode: 'onTouched',
    defaultValues: {
      clientName: '',
      phone: '',
      area: '',
      provinceId: '',
      districtId: '',
      communeId: '',
      quantities: {},
      sitePhotos: [],
      files: [],
    },
  })

  const area = useWatch({ control: form.control, name: 'area' })
  const provinceId = useWatch({ control: form.control, name: 'provinceId' })
  const districtId = useWatch({ control: form.control, name: 'districtId' })
  const files = useWatch({ control: form.control, name: 'files' })

  // GPS readings arrive after a photo is added, so updates start from the latest list
  const updateSitePhotos = (update: (photos: SitePhoto[]) => SitePhoto[]) => {
    const next = update(form.getValues('sitePhotos'))
    form.setValue('sitePhotos', next, {
      shouldValidate: form.formState.isSubmitted,
    })
    if (next.length) form.clearErrors('files')
  }

  const provinces = useProvinces()
  const capital = provinces.data?.find(isCapital)
  const provinceOptions = provinces.data?.filter((p) => !isCapital(p))
  const isCapitalArea = area === 'capital'

  // Choosing Phnom Penh selects it as the province; choosing Province starts empty
  const chooseArea = (next: 'province' | 'capital') => {
    if (next === area) return
    form.setValue('area', next, { shouldValidate: true })
    form.setValue('provinceId', next === 'capital' ? (capital?.id ?? '') : '')
    form.setValue('districtId', '')
    form.setValue('communeId', '')
    form.clearErrors(['provinceId', 'districtId', 'communeId'])
  }

  // If the list finishes loading after Phnom Penh was chosen, fill it in then
  useEffect(() => {
    if (area === 'capital' && capital && !provinceId) {
      form.setValue('provinceId', capital.id)
    }
  }, [area, capital, provinceId, form])
  const catalog = useStockCatalog()
  const steps = useMemo(() => buildSteps(catalog.data), [catalog.data])
  const lastStep = steps.length - 1
  const current = steps[Math.min(step, lastStep)]
  const onStockStep =
    current.kind === 'brand' || current.kind === 'stockPending'
  const stockBrand = current.kind === 'brand' ? current.brand : null
  useEffect(() => {
    onStockStepChange?.(onStockStep ? { brand: stockBrand } : null)
  }, [onStockStep, stockBrand, onStockStepChange])
  const stepOf = (field: string) =>
    steps.findIndex((s) => (s.fields as string[]).includes(field))
  const districts = useDistricts(provinceId || undefined)
  const communes = useCommunes(districtId || undefined, provinceId || undefined)

  const mutation = useMutation({
    mutationFn: (values: FormOutput) =>
      submitClient(
        {
          ...values,
          sitePhotos: values.sitePhotos.flatMap(({ photoId, file, gps }) =>
            gps ? [{ photoId, file, gps }] : []
          ),
          // Every catalog product is sent; blank boxes count as 0
          stockItems: (catalog.data?.brands ?? []).flatMap((brand) =>
            brand.products.map((product) => {
              const q = values.quantities[product.id]
              // Only the quantities this brand counts; the rest are 0
              return {
                productId: product.id,
                ...Object.fromEntries(
                  brand.measures.map((key) => [key, toNumber(q?.[key])])
                ),
              }
            })
          ),
        },
        {
          idempotencyKey: idempotencyKey.current,
          onProgress: setProgress,
        }
      ),
    onMutate: () => setProgress(0),
    onSuccess: (result) => {
      idempotencyKey.current = createIdempotencyKey()
      onSuccess(result)
    },
    onError: (error) => {
      // Put backend validation messages next to their fields and show that step
      let firstStep = -1
      const products = (catalog.data?.brands ?? []).flatMap((b) =>
        b.products.map((p) => ({ ...p, measures: b.measures }))
      )
      for (const { field, message } of getFieldErrors(error)) {
        const stock = /^stockItems\.(\d+)\.(\w+)$/.exec(field ?? '')
        if (stock) {
          const product = products[Number(stock[1])]
          const key = (product?.measures as string[] | undefined)?.includes(
            stock[2]
          )
            ? stock[2]
            : (product?.measures[0] ?? 'cases')
          if (product) {
            form.setError(
              `quantities.${product.id}.${key}` as FieldPath<FormInput>,
              { message }
            )
          }
          const stockStep = product
            ? stepOf(`quantities.${product.id}.${key}`)
            : -1
          if (stockStep >= 0 && (firstStep < 0 || stockStep < firstStep))
            firstStep = stockStep
          continue
        }
        const name = field?.startsWith('files')
          ? 'files'
          : field?.startsWith('sitePhoto')
            ? 'sitePhotos'
            : field
        const fieldStep = name ? stepOf(name) : -1
        if (fieldStep < 0) continue
        form.setError(name as FieldPath<FormInput>, { message })
        if (firstStep < 0 || fieldStep < firstStep) firstStep = fieldStep
      }
      if (firstStep >= 0) setStep(firstStep)
    },
  })

  const isSubmitting = mutation.isPending
  const fieldErrors = mutation.isError ? getFieldErrors(mutation.error) : []
  const showGeneralError =
    mutation.isError &&
    !fieldErrors.some(
      (e) =>
        e.field &&
        (e.field.startsWith('stockItems') || stepOf(e.field.split('.')[0]) >= 0)
    )

  const next = async () => {
    // Products must be loaded before moving past the stock placeholder
    if (current.kind === 'stockPending') return
    const valid = await form.trigger(current.fields)
    if (valid) {
      setStep((s) => Math.min(s + 1, lastStep))
      window.scrollTo({ top: 0 })
    }
  }

  const back = () => {
    setStep((s) => Math.max(s - 1, 0))
    window.scrollTo({ top: 0 })
  }

  return (
    <Form {...form}>
      <form
        // Enter on an earlier step moves forward instead of submitting
        onSubmit={
          step < lastStep
            ? (event) => {
                event.preventDefault()
                void next()
              }
            : form.handleSubmit((values) => mutation.mutate(values))
        }
        className='grid gap-5 *:min-w-0'
        noValidate
      >
        {showGeneralError && (
          <Alert variant='destructive'>
            <AlertDescription>
              {getErrorMessage(
                mutation.error,
                'មិនអាចបញ្ជូនបានទេ សូមព្យាយាមម្តងទៀត · Unable to submit. Please try again.'
              )}
            </AlertDescription>
          </Alert>
        )}

        {current.kind === 'details' && (
          <>
            <FormField
              control={form.control}
              name='clientName'
              render={({ field }) => (
                <FormItem>
                  <BilingualLabel kh='ឈ្មោះ ម៉ូយ' en='Client name' />
                  <FormControl>
                    <Input
                      autoComplete='name'
                      placeholder='ឧ. សុខា ចាន់'
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='phone'
              render={({ field }) => (
                <FormItem>
                  <BilingualLabel kh='លេខទូរស័ព្ទ' en='Phone number' />
                  <FormControl>
                    <Input
                      type='tel'
                      inputMode='tel'
                      autoComplete='tel'
                      placeholder='012 345 678'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {current.kind === 'location' && (
          <>
            <FormField
              control={form.control}
              name='area'
              render={({ field, fieldState }) => (
                <FormItem>
                  <BilingualLabel kh='ទីតាំង' en='Location' />
                  <Select
                    value={field.value || undefined}
                    onValueChange={(value) =>
                      chooseArea(value as 'province' | 'capital')
                    }
                  >
                    <FormControl>
                      <SelectTrigger
                        className='h-10 w-full'
                        aria-invalid={!!fieldState.error}
                      >
                        <SelectValue placeholder='ជ្រើសរើសទីតាំង · Select location' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='province'>ខេត្ត · Province</SelectItem>
                      <SelectItem value='capital'>
                        ភ្នំពេញ · Phnom Penh
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {area === 'province' && (
              <FormField
                control={form.control}
                name='provinceId'
                render={({ field, fieldState }) => (
                  <FormItem>
                    <BilingualLabel kh='ខេត្ត' en='Province' />
                    <FormControl>
                      <OptionCombobox
                        value={field.value}
                        onChange={(value) => {
                          if (value === field.value) return
                          field.onChange(value)
                          form.setValue('districtId', '')
                          form.setValue('communeId', '')
                        }}
                        onBlur={field.onBlur}
                        options={toLocationOptions(provinceOptions)}
                        placeholder='ជ្រើសរើសខេត្ត · Select province'
                        searchPlaceholder='ស្វែងរក · Search...'
                        isLoading={provinces.isLoading}
                        isError={provinces.isError}
                        invalid={!!fieldState.error}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {area && (
              <>
                <FormField
                  control={form.control}
                  name='districtId'
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <BilingualLabel
                        kh={isCapitalArea ? 'ខណ្ឌ' : 'ស្រុក / ក្រុង'}
                        en={isCapitalArea ? 'Khan' : 'District / Municipality'}
                      />
                      <FormControl>
                        <OptionCombobox
                          value={field.value}
                          onChange={(value) => {
                            if (value === field.value) return
                            field.onChange(value)
                            form.setValue('communeId', '')
                          }}
                          onBlur={field.onBlur}
                          options={toLocationOptions(districts.data)}
                          placeholder={
                            provinceId
                              ? 'ជ្រើសរើសស្រុក · Select district'
                              : 'សូមជ្រើសរើសខេត្តជាមុន · Select a province first'
                          }
                          searchPlaceholder='ស្វែងរក · Search...'
                          isLoading={!!provinceId && districts.isLoading}
                          isError={districts.isError}
                          disabled={!provinceId}
                          invalid={!!fieldState.error}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='communeId'
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <BilingualLabel
                        kh={isCapitalArea ? 'សង្កាត់' : 'ឃុំ / សង្កាត់'}
                        en={isCapitalArea ? 'Sangkat' : 'Commune / Sangkat'}
                      />
                      <FormControl>
                        <OptionCombobox
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          options={toLocationOptions(communes.data)}
                          placeholder={
                            districtId
                              ? 'ជ្រើសរើសឃុំ · Select commune'
                              : 'សូមជ្រើសរើសស្រុកជាមុន · Select a district first'
                          }
                          searchPlaceholder='ស្វែងរក · Search...'
                          isLoading={!!districtId && communes.isLoading}
                          isError={communes.isError}
                          disabled={!districtId}
                          invalid={!!fieldState.error}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </>
        )}

        {current.kind === 'stockPending' &&
          (catalog.isError ? (
            <Alert variant='destructive'>
              <AlertDescription>
                {getErrorMessage(
                  catalog.error,
                  'មិនអាចផ្ទុកផលិតផលបានទេ · Unable to load products.'
                )}
              </AlertDescription>
            </Alert>
          ) : (
            <div className='grid gap-3'>
              <Skeleton className='h-24' />
              <Skeleton className='h-24' />
            </div>
          ))}

        {current.kind === 'brand' && catalog.data && (
          <BrandStep
            key={current.brand.id}
            brand={current.brand}
            // Only the rows this brand counts (wedding beer: cases only)
            measures={catalog.data.measures.filter((m) =>
              current.brand.measures.includes(m.key)
            )}
            control={form.control}
          />
        )}

        {current.kind === 'photos' && (
          <>
            <FormField
              control={form.control}
              name='sitePhotos'
              render={({ field, fieldState }) => (
                <FormItem>
                  <BilingualLabel kh='រូបភាព' en='Photos' />
                  {/* One upload box: photos (with GPS) and PDFs */}
                  <SitePhotos
                    value={field.value}
                    onUpdate={updateSitePhotos}
                    documents={files}
                    onDocumentsChange={(next) => {
                      form.setValue('files', next, {
                        shouldValidate: form.formState.isSubmitted,
                      })
                      if (next.length) form.clearErrors('files')
                    }}
                    disabled={isSubmitting}
                    invalid={
                      !!fieldState.error || !!form.formState.errors.files
                    }
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* "At least one file" / file-limit messages */}
            <FormField
              control={form.control}
              name='files'
              render={() => (
                <FormItem className='-mt-3'>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <div className='grid gap-2'>
          <div className='flex gap-2'>
            {step > 0 && (
              <Button
                type='button'
                variant='outline'
                size='lg'
                onClick={back}
                disabled={isSubmitting}
              >
                <ArrowLeft />
                ថយក្រោយ · Back
              </Button>
            )}
            {step < lastStep ? (
              <Button type='submit' size='lg' className='flex-1'>
                បន្ទាប់ · Next
                <ArrowRight />
              </Button>
            ) : (
              <Button
                type='submit'
                size='lg'
                className='flex-1'
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className='animate-spin' /> : <Send />}
                {isSubmitting
                  ? `កំពុងបញ្ជូន... ${progress}%`
                  : 'បញ្ជូន · Submit'}
              </Button>
            )}
          </div>
          {isSubmitting && (
            <div
              className='h-1 overflow-hidden rounded-full bg-muted'
              role='progressbar'
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className='h-full bg-primary transition-[width]'
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </form>
    </Form>
  )
}
