import { useEffect } from 'react'
import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { useDistricts, useProvinces } from '@/features/clients/data/queries'
import { type LocationOption } from '@/features/clients/data/schema'
import { OptionCombobox } from '@/features/submit/components/option-combobox'
import { getFieldErrors } from '@/features/submit/data/api'
import {
  type LocationLevel,
  type LocationRef,
  createLocation,
  updateLocation,
} from '../data/api'
import { LEVEL_LABEL } from '../lib/levels'

export type LocationDialogState =
  | {
      mode: 'create'
      level?: LocationLevel
      provinceId?: string
      districtId?: string
    }
  | {
      mode: 'edit'
      level: LocationLevel
      item: LocationRef
      /** e.g. "ខេត្តកណ្ដាល › ក្រុងតាខ្មៅ", shown for context */
      parentLabel?: string
    }

const formSchema = z
  .object({
    mode: z.enum(['create', 'edit']),
    level: z.enum(['provinces', 'districts', 'communes']),
    provinceId: z.string(),
    districtId: z.string(),
    nameKh: z.string().trim().min(1, 'Enter the Khmer name'),
    nameEn: z.string().trim(),
    isActive: z.boolean(),
  })
  .superRefine((values, ctx) => {
    // Parents are chosen only when creating; editing changes names and status
    if (values.mode === 'edit') return
    if (values.level !== 'provinces' && !values.provinceId) {
      ctx.addIssue({
        code: 'custom',
        path: ['provinceId'],
        message: 'Select a province',
      })
    }
    if (values.level === 'communes' && !values.districtId) {
      ctx.addIssue({
        code: 'custom',
        path: ['districtId'],
        message: 'Select a district',
      })
    }
  })

type FormValues = z.infer<typeof formSchema>

const toOptions = (items: LocationOption[] | undefined) =>
  items?.map((item) => ({
    value: item.id,
    label: item.nameKh || item.nameEn,
    description: item.nameKh && item.nameEn ? item.nameEn : undefined,
  }))

type LocationDialogProps = {
  state: LocationDialogState | null
  onOpenChange: (open: boolean) => void
}

export function LocationDialog({ state, onOpenChange }: LocationDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = state?.mode === 'edit'

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mode: 'create',
      level: 'communes',
      provinceId: '',
      districtId: '',
      nameKh: '',
      nameEn: '',
      isActive: true,
    },
  })

  // Reset the form each time the dialog opens for a different target
  useEffect(() => {
    if (!state) return
    form.reset(
      state.mode === 'edit'
        ? {
            mode: 'edit',
            level: state.level,
            provinceId: '',
            districtId: '',
            nameKh: state.item.nameKh,
            nameEn: state.item.nameEn,
            isActive: state.item.isActive,
          }
        : {
            mode: 'create',
            level: state.level ?? 'communes',
            provinceId: state.provinceId ?? '',
            districtId: state.districtId ?? '',
            nameKh: '',
            nameEn: '',
            isActive: true,
          }
    )
  }, [state, form])

  const level = useWatch({ control: form.control, name: 'level' })
  const provinceId = useWatch({ control: form.control, name: 'provinceId' })

  const provinces = useProvinces()
  const districts = useDistricts(
    !isEdit && level === 'communes' && provinceId ? provinceId : undefined
  )

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (state?.mode === 'edit') {
        return updateLocation(state.level, state.item.id, {
          nameKh: values.nameKh,
          nameEn: values.nameEn,
          isActive: values.isActive,
        })
      }
      return createLocation(values.level, {
        parentId:
          values.level === 'districts'
            ? values.provinceId
            : values.level === 'communes'
              ? values.districtId
              : undefined,
        nameKh: values.nameKh,
        nameEn: values.nameEn || undefined,
      })
    },
    onSuccess: (_, values) => {
      // Table, summary counts and every location dropdown
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success(
        `${LEVEL_LABEL[values.level].en} ${isEdit ? 'updated' : 'added'}`,
        { description: values.nameKh }
      )
      onOpenChange(false)
    },
    onError: (error) => {
      const fieldErrors = getFieldErrors(error).filter(
        (e) => e.field === 'nameKh'
      )
      if (fieldErrors.length) {
        form.setError('nameKh', { message: fieldErrors[0].message })
      } else {
        toast.error(getErrorMessage(error, 'Unable to save the location.'))
      }
    },
  })

  const busy = mutation.isPending
  const labels = LEVEL_LABEL[level]

  return (
    <Dialog open={!!state} onOpenChange={(open) => !busy && onOpenChange(open)}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit ${labels.en.toLowerCase()}` : 'Add location'}
          </DialogTitle>
          <DialogDescription>
            {isEdit && state.parentLabel
              ? state.parentLabel
              : 'Names must be unique within their parent.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id='location-form'
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            className='grid gap-4'
          >
            {!isEdit && (
              <FormField
                control={form.control}
                name='level'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value)
                          form.clearErrors()
                        }}
                        className='grid grid-cols-3 gap-2'
                        disabled={busy}
                      >
                        {(Object.keys(LEVEL_LABEL) as LocationLevel[]).map(
                          (key) => (
                            <label
                              key={key}
                              className='flex cursor-pointer flex-col items-center gap-1 rounded-md border p-2 text-center text-sm has-data-[state=checked]:border-primary has-data-[state=checked]:bg-muted'
                            >
                              <RadioGroupItem value={key} className='sr-only' />
                              <span className='font-medium'>
                                {LEVEL_LABEL[key].en}
                              </span>
                              <span className='text-xs text-muted-foreground'>
                                {LEVEL_LABEL[key].kh}
                              </span>
                            </label>
                          )
                        )}
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {!isEdit && level !== 'provinces' && (
              <FormField
                control={form.control}
                name='provinceId'
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Province</FormLabel>
                    <FormControl>
                      <OptionCombobox
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value)
                          form.setValue('districtId', '')
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
            )}

            {!isEdit && level === 'communes' && (
              <FormField
                control={form.control}
                name='districtId'
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>District</FormLabel>
                    <FormControl>
                      <OptionCombobox
                        value={field.value}
                        onChange={field.onChange}
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
            )}

            <FormField
              control={form.control}
              name='nameKh'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {labels.en} name (Khmer) · {labels.kh}
                  </FormLabel>
                  <FormControl>
                    <Input autoFocus disabled={busy} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='nameEn'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>English name (optional)</FormLabel>
                  <FormControl>
                    <Input disabled={busy} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEdit && (
              <FormField
                control={form.control}
                name='isActive'
                render={({ field }) => (
                  <FormItem className='flex items-center justify-between gap-4 rounded-md border p-3'>
                    <div className='grid gap-1'>
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Inactive locations are hidden from the forms and filters
                        but kept for existing submissions.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={busy}
                      />
                    </FormControl>
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
          <Button type='submit' form='location-form' disabled={busy}>
            {busy && <Loader2 className='animate-spin' />}
            {isEdit ? 'Save changes' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
