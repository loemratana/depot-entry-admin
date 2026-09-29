import { useEffect } from 'react'
import { z } from 'zod'
import { type FieldPath, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/handle-server-error'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { FilePicker } from '@/features/submit/components/file-picker'
import { OptionCombobox } from '@/features/submit/components/option-combobox'
import { SaleGbInput } from '@/features/submit/components/sale-gb-input'
import { getFieldErrors } from '@/features/submit/data/api'
import { PHONE_PATTERN, normalizePhone } from '@/features/submit/lib/files'
import { saleNameKey } from '@/features/submit/lib/sale-name'
import { type ClientChanges, type ClientInput } from '../data/api'
import {
  useCommunes,
  useCreateClient,
  useDistricts,
  useProvinces,
  useUpdateClient,
} from '../data/queries'
import { type LocationOption, type Submission } from '../data/schema'

export type ClientFormState =
  | { mode: 'create' }
  | { mode: 'edit'; client: Submission }

const formSchema = z
  .object({
    mode: z.enum(['create', 'edit']),
    clientName: z
      .string()
      .transform((v) => v.normalize('NFC').replace(/\s+/g, ' ').trim())
      .refine((v) => [...v].length >= 2, 'At least 2 characters'),
    phone: z
      .string()
      .transform(normalizePhone)
      .refine((v) => PHONE_PATTERN.test(v), 'Use 9–10 digits starting with 0'),
    provinceId: z.string().min(1, 'Select a province'),
    districtId: z.string().min(1, 'Select a district'),
    communeId: z.string().min(1, 'Select a commune'),
    saleGbName: z
      .string()
      .transform((v) => v.normalize('NFC').replace(/\s+/g, ' ').trim())
      // Optional; when typed it must be a real name
      .refine(
        (v) => v.length === 0 || [...v].length >= 2,
        'At least 2 characters'
      ),
    files: z.array(z.instanceof(File)),
  })
  .refine((values) => values.mode === 'edit' || values.files.length > 0, {
    path: ['files'],
    message: 'Attach at least one file',
  })

type FormInput = z.input<typeof formSchema>
type FormOutput = z.output<typeof formSchema>

const FIELDS = new Set([
  'clientName',
  'phone',
  'provinceId',
  'districtId',
  'communeId',
  'saleGbName',
  'files',
])

const toOptions = (items: LocationOption[] | undefined) =>
  items?.map((item) => ({
    value: item.id,
    label: item.nameKh || item.nameEn,
    description: item.nameKh && item.nameEn ? item.nameEn : undefined,
  }))

const emptyValues: FormInput = {
  mode: 'create',
  clientName: '',
  phone: '',
  provinceId: '',
  districtId: '',
  communeId: '',
  saleGbName: '',
  files: [],
}

/** Only fields that differ from the stored client; the location goes as a whole */
function changedFields(client: Submission, values: FormOutput): ClientChanges {
  const changes: ClientChanges = {}
  if (values.clientName !== client.clientName)
    changes.clientName = values.clientName
  if (values.phone !== normalizePhone(client.phone))
    changes.phone = values.phone
  if (
    values.provinceId !== client.province?.id ||
    values.districtId !== client.district?.id ||
    values.communeId !== client.commune?.id
  ) {
    changes.provinceId = values.provinceId
    changes.districtId = values.districtId
    changes.communeId = values.communeId
  }
  if (saleNameKey(values.saleGbName) !== saleNameKey(client.saleGb?.name ?? ''))
    changes.saleGbName = values.saleGbName
  return changes
}

type ClientFormDialogProps = {
  state: ClientFormState | null
  onOpenChange: (open: boolean) => void
}

export function ClientFormDialog({
  state,
  onOpenChange,
}: ClientFormDialogProps) {
  const isEdit = state?.mode === 'edit'
  const create = useCreateClient()
  const update = useUpdateClient()
  const busy = create.isPending || update.isPending

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (!state) return
    create.reset()
    update.reset()
    form.reset(
      state.mode === 'edit'
        ? {
            mode: 'edit',
            clientName: state.client.clientName,
            phone: state.client.phone,
            provinceId: state.client.province?.id ?? '',
            districtId: state.client.district?.id ?? '',
            communeId: state.client.commune?.id ?? '',
            saleGbName: state.client.saleGb?.name ?? '',
            files: [],
          }
        : emptyValues
    )
    // Mutations are stable objects; reset only when the dialog target changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, form])

  const provinceId = useWatch({ control: form.control, name: 'provinceId' })
  const districtId = useWatch({ control: form.control, name: 'districtId' })
  const provinces = useProvinces()
  const districts = useDistricts(provinceId || undefined)
  const communes = useCommunes(districtId || undefined, provinceId || undefined)

  const showErrors = (error: unknown) => {
    let placed = false
    for (const { field, message } of getFieldErrors(error)) {
      const name = field?.startsWith('files') ? 'files' : field
      if (name && FIELDS.has(name)) {
        form.setError(name as FieldPath<FormInput>, { message })
        placed = true
      }
    }
    if (!placed)
      toast.error(getErrorMessage(error, 'Unable to save the outlet.'))
  }

  const onSubmit = (values: FormOutput) => {
    if (state?.mode === 'edit') {
      const changes = changedFields(state.client, values)
      if (Object.keys(changes).length === 0) {
        onOpenChange(false)
        return
      }
      update.mutate(
        { id: state.client.id, changes },
        {
          onSuccess: () => {
            toast.success('Outlet updated', { description: values.clientName })
            onOpenChange(false)
          },
          onError: showErrors,
        }
      )
      return
    }

    const input: ClientInput = {
      clientName: values.clientName,
      phone: values.phone,
      provinceId: values.provinceId,
      districtId: values.districtId,
      communeId: values.communeId,
      saleGbName: values.saleGbName,
    }
    create.mutate(
      { input, files: values.files },
      {
        onSuccess: () => {
          toast.success('Outlet added', { description: values.clientName })
          onOpenChange(false)
        },
        onError: showErrors,
      }
    )
  }

  return (
    <Dialog open={!!state} onOpenChange={(open) => !busy && onOpenChange(open)}>
      <DialogContent className='max-h-[90svh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit outlet' : 'Add outlet'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Changing the location or Sale GB also updates the names stored with this outlet.'
              : 'Files you attach are recorded as uploaded by an admin.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id='client-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='grid gap-4 *:min-w-0'
            noValidate
          >
            <div className='grid gap-4 *:min-w-0 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='clientName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outlet name · ឈ្មោះ ម៉ូយ</FormLabel>
                    <FormControl>
                      <Input disabled={busy} {...field} />
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
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input
                        type='tel'
                        inputMode='tel'
                        placeholder='012 345 678'
                        disabled={busy}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='provinceId'
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Province · ខេត្ត/ក្រុង</FormLabel>
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
                      options={toOptions(provinces.data)}
                      placeholder='Select province'
                      searchPlaceholder='Search province...'
                      isLoading={provinces.isLoading}
                      isError={provinces.isError}
                      disabled={busy}
                      invalid={!!fieldState.error}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid gap-4 *:min-w-0 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='districtId'
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>District · ខណ្ឌ/ស្រុក</FormLabel>
                    <FormControl>
                      <OptionCombobox
                        value={field.value}
                        onChange={(value) => {
                          if (value === field.value) return
                          field.onChange(value)
                          form.setValue('communeId', '')
                        }}
                        onBlur={field.onBlur}
                        options={toOptions(districts.data)}
                        placeholder={
                          provinceId
                            ? 'Select district'
                            : 'Select a province first'
                        }
                        searchPlaceholder='Search district...'
                        isLoading={!!provinceId && districts.isLoading}
                        isError={districts.isError}
                        disabled={!provinceId || busy}
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
                    <FormLabel>Commune · ឃុំ/សង្កាត់</FormLabel>
                    <FormControl>
                      <OptionCombobox
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        options={toOptions(communes.data)}
                        placeholder={
                          districtId
                            ? 'Select commune'
                            : 'Select a district first'
                        }
                        searchPlaceholder='Search commune...'
                        isLoading={!!districtId && communes.isLoading}
                        isError={communes.isError}
                        disabled={!districtId || busy}
                        invalid={!!fieldState.error}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='saleGbName'
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>
                    Sale GB{' '}
                    <span className='font-normal text-muted-foreground'>
                      (optional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <SaleGbInput
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder='Type the Sale GB name'
                      disabled={busy}
                      invalid={!!fieldState.error}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEdit && (
              <FormField
                control={form.control}
                name='files'
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Documents</FormLabel>
                    <FormControl>
                      <FilePicker
                        value={field.value}
                        onChange={(files) => {
                          field.onChange(files)
                          if (files.length) form.clearErrors('files')
                        }}
                        disabled={busy}
                        invalid={!!fieldState.error}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </form>
        </Form>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button type='submit' form='client-form' disabled={busy}>
            {busy && <Loader2 className='animate-spin' />}
            {isEdit ? 'Save changes' : 'Add outlet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
