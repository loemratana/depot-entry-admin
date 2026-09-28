import { useRef, useState } from 'react'
import { z } from 'zod'
import { type FieldPath, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Send } from 'lucide-react'
import { getErrorMessage } from '@/lib/handle-server-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  useCommunes,
  useDistricts,
  useProvinces,
  useSales,
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
  provinceId: required('សូមជ្រើសរើសខេត្ត/រាជធានី · Select a province'),
  districtId: required('សូមជ្រើសរើសស្រុក/ខណ្ឌ · Select a district'),
  communeId: required('សូមជ្រើសរើសឃុំ/សង្កាត់ · Select a commune'),
  saleGbId: required('សូមជ្រើសរើស Sale GB · Select a Sale GB'),
  files: z
    .array(z.instanceof(File))
    .min(1, 'សូមភ្ជាប់ឯកសារយ៉ាងហោចណាស់ ១ · Attach at least one file'),
})

type FormInput = z.input<typeof formSchema>
type FormOutput = z.output<typeof formSchema>

const toLocationOptions = (
  items: LocationOption[] | undefined
): Option[] | undefined =>
  items?.map((item) => ({
    value: item.id,
    label: item.nameKh || item.nameEn,
    description: item.nameKh && item.nameEn ? item.nameEn : undefined,
  }))

const FORM_FIELDS = new Set<string>([
  'clientName',
  'phone',
  'provinceId',
  'districtId',
  'communeId',
  'saleGbId',
  'files',
])

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

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: '',
      phone: '',
      provinceId: '',
      districtId: '',
      communeId: '',
      saleGbId: '',
      files: [],
    },
  })

  const provinceId = useWatch({ control: form.control, name: 'provinceId' })
  const districtId = useWatch({ control: form.control, name: 'districtId' })

  const provinces = useProvinces()
  const districts = useDistricts(provinceId || undefined)
  const communes = useCommunes(districtId || undefined, provinceId || undefined)
  const sales = useSales()

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
      // Put backend validation messages next to the matching fields
      for (const { field, message } of getFieldErrors(error)) {
        const name = field?.startsWith('files') ? 'files' : field
        if (name && FORM_FIELDS.has(name)) {
          form.setError(name as FieldPath<FormInput>, { message })
        }
      }
    },
  })

  const isSubmitting = mutation.isPending
  const fieldErrors = mutation.isError ? getFieldErrors(mutation.error) : []
  const showGeneralError =
    mutation.isError &&
    !fieldErrors.some((e) => e.field && FORM_FIELDS.has(e.field.split('.')[0]))

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='provinceId'
          render={({ field, fieldState }) => (
            <FormItem>
              <BilingualLabel kh='ខេត្ត / រាជធានី' en='Province / Capital' />
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
                  options={toLocationOptions(provinces.data)}
                  placeholder='ជ្រើសរើសខេត្ត · Select province'
                  searchPlaceholder='ស្វែងរក · Search...'
                  isLoading={provinces.isLoading}
                  isError={provinces.isError}
                  disabled={isSubmitting}
                  invalid={!!fieldState.error}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='districtId'
          render={({ field, fieldState }) => (
            <FormItem>
              <BilingualLabel kh='ស្រុក / ខណ្ឌ / ក្រុង' en='District / Khan' />
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
                  disabled={!provinceId || isSubmitting}
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
              <BilingualLabel kh='ឃុំ / សង្កាត់' en='Commune / Sangkat' />
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
                  disabled={!districtId || isSubmitting}
                  invalid={!!fieldState.error}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='saleGbId'
          render={({ field, fieldState }) => (
            <FormItem>
              <BilingualLabel kh='Sale GB' en='Sales representative' />
              <FormControl>
                <OptionCombobox
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  options={sales.data?.map((sale) => ({
                    value: sale.id,
                    label: sale.name,
                  }))}
                  placeholder='ជ្រើសរើស Sale GB · Select Sale GB'
                  searchPlaceholder='ស្វែងរក · Search...'
                  isLoading={sales.isLoading}
                  isError={sales.isError}
                  disabled={isSubmitting}
                  invalid={!!fieldState.error}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='files'
          render={({ field, fieldState }) => (
            <FormItem>
              <BilingualLabel kh='ឯកសារភ្ជាប់' en='Documents (photos or PDF)' />
              <FormDescription>
                ឧ. អត្តសញ្ញាណប័ណ្ណ · e.g. ID card, supporting documents
              </FormDescription>
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

        <div className='grid gap-2'>
          <Button type='submit' size='lg' disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className='animate-spin' /> : <Send />}
            {isSubmitting ? `កំពុងបញ្ជូន... ${progress}%` : 'បញ្ជូន · Submit'}
          </Button>
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
