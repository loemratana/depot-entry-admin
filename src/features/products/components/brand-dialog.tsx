import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { apiUrl } from '@/lib/api-client'
import { getErrorMessage } from '@/lib/handle-server-error'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { type Measure, type MeasureKey } from '@/features/stock/data/api'
import {
  type AdminBrand,
  useCreateBrand,
  useRefreshBrands,
  useRemoveLogo,
  useUpdateBrand,
  useUploadLogo,
} from '../data/api'

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const LOGO_MAX_BYTES = 2 * 1024 * 1024

type BrandDialogProps = {
  /** null = closed; 'new' = add a brand */
  brand: AdminBrand | 'new' | null
  measures: Measure[]
  onOpenChange: (open: boolean) => void
  onSaved: (message: string) => void
}

/** Add or edit a brand: names, logo, the stock fields it asks for, active state */
export function BrandDialog({
  brand,
  measures,
  onOpenChange,
  onSaved,
}: BrandDialogProps) {
  const editing = brand && brand !== 'new' ? brand : null
  const open = brand !== null

  const [name, setName] = useState('')
  const [nameKh, setNameKh] = useState('')
  const [fields, setFields] = useState<MeasureKey[]>([])
  const [isActive, setIsActive] = useState(true)
  // undefined = keep; File = replace; null = remove
  const [logo, setLogo] = useState<File | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const createBrand = useCreateBrand()
  const updateBrand = useUpdateBrand()
  const uploadLogo = useUploadLogo()
  const removeLogo = useRemoveLogo()
  const refresh = useRefreshBrands()
  const saving =
    createBrand.isPending ||
    updateBrand.isPending ||
    uploadLogo.isPending ||
    removeLogo.isPending

  // Fill the form each time the dialog opens
  const [openedFor, setOpenedFor] = useState<typeof brand>(null)
  if (brand !== openedFor) {
    setOpenedFor(brand)
    if (brand) {
      setName(editing?.name ?? '')
      setNameKh(editing?.nameKh ?? '')
      setFields(editing?.measures ?? measures.map((m) => m.key))
      setIsActive(editing?.isActive ?? true)
      setLogo(undefined)
      setError(null)
    }
  }

  const preview = useMemo(
    () => (logo ? URL.createObjectURL(logo) : null),
    [logo]
  )
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview]
  )
  const shownLogo =
    logo === null
      ? null
      : (preview ?? (editing?.logoUrl ? apiUrl(editing.logoUrl) : null))

  const pickLogo = (file: File | undefined) => {
    if (!file) return
    if (!LOGO_TYPES.includes(file.type))
      return setError('The logo must be a PNG, JPG or WebP image.')
    if (file.size > LOGO_MAX_BYTES)
      return setError('The logo must be 2 MB or smaller.')
    setError(null)
    setLogo(file)
  }

  const toggleField = (key: MeasureKey, on: boolean) =>
    setFields((current) =>
      // Keep the standard order whatever the click order
      measures
        .map((m) => m.key)
        .filter((k) => (k === key ? on : current.includes(k)))
    )

  const save = async () => {
    if (!name.trim()) return setError('Enter the brand name.')
    if (!fields.length) return setError('Choose at least one stock field.')
    setError(null)
    const input = { name, nameKh, measures: fields, isActive }
    try {
      const saved = editing
        ? await updateBrand.mutateAsync({ id: editing.id, changes: input })
        : await createBrand.mutateAsync(input)
      if (logo) await uploadLogo.mutateAsync({ id: saved.id, file: logo })
      else if (logo === null && editing?.logoUrl)
        await removeLogo.mutateAsync(saved.id)
      refresh()
      onSaved(editing ? 'Brand updated' : 'Brand added')
    } catch (e) {
      refresh()
      setError(getErrorMessage(e, 'Unable to save the brand.'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit brand' : 'Add brand'}</DialogTitle>
          <DialogDescription>
            Each brand is one step of the stock form, with its logo at the top.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4'>
          <div className='flex items-center gap-4'>
            <div className='flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted'>
              {shownLogo ? (
                <img
                  src={shownLogo}
                  alt='Brand logo'
                  className='size-full object-contain'
                />
              ) : (
                <ImagePlus className='size-6 text-muted-foreground' />
              )}
            </div>
            <div className='grid gap-2'>
              <Label>Logo</Label>
              <div className='flex flex-wrap gap-2'>
                <Button
                  type='button'
                  size='sm'
                  className='bg-[#5027F5] text-white hover:bg-[#4119d9]'
                  onClick={() => fileInput.current?.click()}
                  disabled={saving}
                >
                  <ImagePlus />
                  {shownLogo ? 'Change logo' : 'Upload logo'}
                </Button>
                {shownLogo && (
                  <Button
                    type='button'
                    size='sm'
                    className='bg-red-600 text-white hover:bg-red-700'
                    onClick={() => setLogo(null)}
                    disabled={saving}
                  >
                    <Trash2 />
                    Remove
                  </Button>
                )}
              </div>
              <span className='text-xs text-muted-foreground'>
                PNG, JPG or WebP · up to 2 MB
              </span>
              <input
                ref={fileInput}
                type='file'
                accept={LOGO_TYPES.join(',')}
                className='sr-only'
                tabIndex={-1}
                aria-label='Brand logo file'
                onChange={(e) => {
                  pickLogo(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </div>
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='brand-name'>Brand name</Label>
            <Input
              id='brand-name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. GANZBERG'
              maxLength={100}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='brand-name-kh'>ឈ្មោះជាខ្មែរ · Khmer name</Label>
            <Input
              id='brand-name-kh'
              value={nameKh}
              onChange={(e) => setNameKh(e.target.value)}
              placeholder='ឧ. ស្រាបៀរហ្គែនប៊ឺក'
              maxLength={100}
            />
          </div>

          <fieldset className='grid gap-2'>
            <legend className='mb-1 text-sm font-medium'>
              Stock fields on the form
            </legend>
            {measures.map((m) => (
              <label
                key={m.key}
                className='flex items-center gap-2 text-sm'
                htmlFor={`field-${m.key}`}
              >
                <Checkbox
                  id={`field-${m.key}`}
                  checked={fields.includes(m.key)}
                  onCheckedChange={(checked) =>
                    toggleField(m.key, checked === true)
                  }
                />
                {m.kh}
                <span className='text-muted-foreground'>· {m.en}</span>
              </label>
            ))}
          </fieldset>

          <label className='flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm'>
            <span>
              Active
              <span className='block text-xs text-muted-foreground'>
                Inactive brands are hidden from the stock form
              </span>
            </span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </label>

          {error && (
            <p className='text-sm text-destructive' role='alert'>
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className='animate-spin' />}
            {editing ? 'Save changes' : 'Add brand'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
