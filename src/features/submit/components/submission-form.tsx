import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { type FieldPath, useForm, useWatch } from 'react-hook-form'
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
import {
  useCommunes,
  useDistricts,
  useProvinces,
} from '@/features/clients/data/queries'
import { type LocationOption } from '@/features/clients/data/schema'
import {
  type SubmitClientResult,
  getFieldErrors,
  submitClient,
} from '../data/api'
import {
  PHONE_PATTERN,
  createIdempotencyKey,
  normalizePhone,
} from '../lib/files'
import { FilePicker } from './file-picker'
import { type Option, OptionCombobox } from './option-combobox'

const required = (message: string) => z.string().min(1, message)

const formSchema = z.object({
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
  files: z
    .array(z.instanceof(File))
    .min(1, 'សូមភ្ជាប់រូបភាពយ៉ាងហោចណាស់ ១ · Attach at least one photo'),
})

type FormInput = z.input<typeof formSchema>
type FormOutput = z.output<typeof formSchema>
type FieldName = keyof FormInput

// The form is split into steps; each step validates only its own fields
const STEPS: { kh: string; en: string; fields: FieldName[] }[] = [
  { kh: 'ព័ត៌មាន', en: 'Details', fields: ['clientName', 'phone'] },
  {
    kh: 'ទីតាំង',
    en: 'Location',
    fields: ['area', 'provinceId', 'districtId', 'communeId'],
  },
  { kh: 'រូបភាព', en: 'Photos', fields: ['files'] },
]
const LAST_STEP = STEPS.length - 1

const stepOf = (field: string) =>
  STEPS.findIndex((step) => (step.fields as string[]).includes(field))

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

/** Two-line label: Khmer first, English underneath */
function BilingualLabel({ kh, en }: { kh: string; en: string }) {
  return (
    <FormLabel className='flex flex-col items-start gap-0.5'>
      <span>
        {kh} <span className='text-destructive'>*</span>
      </span>
      <span className='text-xs font-normal text-muted-foreground'>{en}</span>
    </FormLabel>
  )
}

type SubmissionFormProps = {
  onSuccess: (result: SubmitClientResult) => void
}

export function SubmissionForm({ onSuccess }: SubmissionFormProps) {
  // One key per filled-in form, so retries and double taps never create duplicates
  const idempotencyKey = useRef(createIdempotencyKey())
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState(0)

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: '',
      phone: '',
      area: '',
      provinceId: '',
      districtId: '',
      communeId: '',
      files: [],
    },
  })

  const area = useWatch({ control: form.control, name: 'area' })
  const provinceId = useWatch({ control: form.control, name: 'provinceId' })
  const districtId = useWatch({ control: form.control, name: 'districtId' })

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
  const districts = useDistricts(provinceId || undefined)
  const communes = useCommunes(districtId || undefined, provinceId || undefined)

  const mutation = useMutation({
    mutationFn: (values: FormOutput) =>
      submitClient(values, {
        idempotencyKey: idempotencyKey.current,
        onProgress: setProgress,
      }),
    onMutate: () => setProgress(0),
    onSuccess: (result) => {
      idempotencyKey.current = createIdempotencyKey()
      onSuccess(result)
    },
    onError: (error) => {
      // Put backend validation messages next to their fields and show that step
      let firstStep = -1
      for (const { field, message } of getFieldErrors(error)) {
        const name = field?.startsWith('files') ? 'files' : field
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
    !fieldErrors.some((e) => e.field && stepOf(e.field.split('.')[0]) >= 0)

  const next = async () => {
    const valid = await form.trigger(STEPS[step].fields)
    if (valid) {
      setStep((s) => Math.min(s + 1, LAST_STEP))
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
          step < LAST_STEP
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

        {step === 0 && (
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

        {step === 1 && (
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

        {step === 2 && (
          <FormField
            control={form.control}
            name='files'
            render={({ field, fieldState }) => (
              <FormItem>
                <BilingualLabel kh='រូបភាព' en='Photos' />
                <FormControl>
                  <FilePicker
                    value={field.value}
                    onChange={(files) => {
                      field.onChange(files)
                      if (files.length) form.clearErrors('files')
                    }}
                    disabled={isSubmitting}
                    invalid={!!fieldState.error}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
            {step < LAST_STEP ? (
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
