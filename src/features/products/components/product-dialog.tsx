import { useState } from 'react'
import { Loader2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  type AdminBrand,
  type AdminProduct,
  useCreateProduct,
  useRefreshBrands,
  useUpdateProduct,
} from '../data/api'

/** null = closed; product null = add a new product to the brand */
export type ProductTarget = {
  brand: AdminBrand
  product: AdminProduct | null
} | null

type ProductDialogProps = {
  target: ProductTarget
  onOpenChange: (open: boolean) => void
  onSaved: (message: string) => void
}

export function ProductDialog({
  target,
  onOpenChange,
  onSaved,
}: ProductDialogProps) {
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const refresh = useRefreshBrands()
  const saving = createProduct.isPending || updateProduct.isPending
  const editing = target?.product ?? null

  // Fill the form each time the dialog opens
  const [openedFor, setOpenedFor] = useState<ProductTarget>(null)
  if (target !== openedFor) {
    setOpenedFor(target)
    if (target) {
      setName(target.product?.name ?? '')
      setShortName(target.product?.shortName ?? '')
      setIsActive(target.product?.isActive ?? true)
      setError(null)
    }
  }

  const save = async () => {
    if (!target) return
    if (!name.trim()) return setError('Enter the product name.')
    setError(null)
    try {
      if (editing)
        await updateProduct.mutateAsync({
          id: editing.id,
          changes: { name, shortName, isActive },
        })
      else
        await createProduct.mutateAsync({
          brandId: target.brand.id,
          input: { name, shortName, isActive },
        })
      refresh()
      onSaved(editing ? 'Product updated' : 'Product added')
    } catch (e) {
      setError(getErrorMessage(e, 'Unable to save the product.'))
    }
  }

  return (
    <Dialog
      open={!!target}
      onOpenChange={(next) => !saving && onOpenChange(next)}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit product' : 'Add product'}</DialogTitle>
          <DialogDescription>
            {target?.brand.name}. On the stock form each field is labelled with
            this name, e.g. "ចំនួនកេស {name || 'Product'}".
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4'>
          <div className='grid gap-2'>
            <Label htmlFor='product-name'>Product name</Label>
            <Input
              id='product-name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void save()}
              placeholder='e.g. Ganzberg Gold'
              maxLength={150}
              autoFocus
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='product-short-name'>
              Short name{' '}
              <span className='font-normal text-muted-foreground'>
                (optional)
              </span>
            </Label>
            <Input
              id='product-short-name'
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void save()}
              placeholder='e.g. GB Gold'
              maxLength={30}
            />
            <p className='text-xs text-muted-foreground'>
              Shown on the dashboard card. Leave empty to use the product name.
            </p>
          </div>
          <label className='flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm'>
            <span>
              Active
              <span className='block text-xs text-muted-foreground'>
                Inactive products are hidden from the stock form
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
            {editing ? 'Save changes' : 'Add product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
