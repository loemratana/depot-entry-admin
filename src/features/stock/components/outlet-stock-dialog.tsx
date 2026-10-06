import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'
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
import { getFieldErrors } from '@/features/submit/data/api'
import {
  type MeasureKey,
  type StockReport,
  useSetOutletStock,
  useStockCatalog,
} from '../data/api'

type Quantities = Record<string, Partial<Record<MeasureKey, string>>>

type OutletStockDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  outlet: { id: string; name: string }
  /** The outlet's current stock; null when it has none (adding it again) */
  report: StockReport | null
}

const MAX_QUANTITY = 1_000_000

/** The report's quantities as text boxes; 0 shows as blank, like on the form */
const fromReport = (report: StockReport | null): Quantities =>
  Object.fromEntries(
    (report?.items ?? []).map((item) => [
      item.productId,
      Object.fromEntries(
        item.measures.map((key) => [key, item[key] ? String(item[key]) : ''])
      ),
    ])
  )

/**
 * Edit an outlet's stock, or add it again after it was deleted. Every active
 * product is listed with the quantities its brand counts; blank = 0, like on
 * the outlet form. Saving replaces the outlet's quantities.
 */
export function OutletStockDialog({
  open,
  onOpenChange,
  outlet,
  report,
}: OutletStockDialogProps) {
  const catalog = useStockCatalog()
  const save = useSetOutletStock()
  const [values, setValues] = useState<Quantities>(() => fromReport(report))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (productId: string, key: MeasureKey, value: string) => {
    setValues((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [key]: value },
    }))
    setErrors((prev) => {
      const { [`${productId}.${key}`]: _removed, ...rest } = prev
      return rest
    })
  }

  const submit = () => {
    const brands = catalog.data?.brands ?? []
    const found: Record<string, string> = {}
    const stockItems = brands.flatMap((brand) =>
      brand.products.map((product) => ({
        productId: product.id,
        ...Object.fromEntries(
          brand.measures.map((key) => {
            const text = values[product.id]?.[key]?.trim() ?? ''
            if (text && (!/^\d+$/.test(text) || Number(text) > MAX_QUANTITY)) {
              found[`${product.id}.${key}`] =
                `Whole number from 0 to ${MAX_QUANTITY.toLocaleString()}`
            }
            return [key, text ? Number(text) : 0]
          })
        ),
      }))
    )
    setErrors(found)
    if (Object.keys(found).length || stockItems.length === 0) return
    save.mutate(
      { outletId: outlet.id, stockItems },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  const serverErrors = save.isError ? getFieldErrors(save.error) : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90svh] flex-col gap-0 p-0 sm:max-w-xl'>
        <DialogHeader className='border-b p-4'>
          <DialogTitle>
            {report ? 'Edit stock' : 'Add stock'} · {outlet.name}
          </DialogTitle>
          <DialogDescription>
            {report
              ? 'ទុកចន្លោះ = ០ · Blank = 0. Saving replaces this outlet’s quantities.'
              : 'ទុកចន្លោះ = ០ · Blank = 0. The stock is dated like the outlet, so the dashboards count it in the same period.'}
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto p-4'>
          {catalog.isPending ? (
            <Loader2 className='mx-auto size-5 animate-spin text-muted-foreground' />
          ) : catalog.isError ? (
            <p className='text-sm text-destructive'>
              {getErrorMessage(catalog.error, 'Unable to load the products.')}
            </p>
          ) : (
            <div className='grid gap-5'>
              {catalog.data.brands.map((brand) => (
                <section key={brand.id} className='grid gap-3'>
                  <h3 className='text-sm font-semibold text-primary'>
                    {brand.nameKh
                      ? `${brand.nameKh} | ${brand.name}`
                      : brand.name}
                  </h3>
                  {brand.products.map((product) => (
                    <div
                      key={product.id}
                      className='grid gap-3 rounded-md border p-3'
                    >
                      <p className='text-sm font-medium'>{product.name}</p>
                      <div className='grid gap-3 sm:grid-cols-2'>
                        {catalog.data.measures
                          .filter((measure) =>
                            brand.measures.includes(measure.key)
                          )
                          .map((measure) => {
                            const id = `stock-${product.id}-${measure.key}`
                            const error = errors[`${product.id}.${measure.key}`]
                            return (
                              <div key={measure.key} className='grid gap-1.5'>
                                <Label htmlFor={id} className='font-normal'>
                                  {measure.kh}
                                </Label>
                                <Input
                                  id={id}
                                  inputMode='numeric'
                                  placeholder='0'
                                  autoComplete='off'
                                  aria-invalid={!!error}
                                  value={
                                    values[product.id]?.[measure.key] ?? ''
                                  }
                                  onChange={(e) =>
                                    set(product.id, measure.key, e.target.value)
                                  }
                                />
                                {error && (
                                  <p className='text-xs text-destructive'>
                                    {error}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className='gap-2 border-t p-4'>
          {save.isError && (
            <p className='me-auto text-sm text-destructive'>
              {serverErrors[0]?.message ??
                getErrorMessage(save.error, 'Unable to save the stock.')}
            </p>
          )}
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={save.isPending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={save.isPending || !catalog.data}>
            {save.isPending ? <Loader2 className='animate-spin' /> : <Save />}
            Save stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
