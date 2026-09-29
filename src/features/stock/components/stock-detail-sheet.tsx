import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { formatDateTime } from '@/features/clients/lib/format'
import { type StockReport, useStockCatalog, useStockReport } from '../data/api'

type StockDetailSheetProps = {
  report: StockReport | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: (report: StockReport) => void
}

const place = (named: { nameKh: string; nameEn: string }) =>
  named.nameEn ? `${named.nameKh} (${named.nameEn})` : named.nameKh

export function StockDetailSheet({
  report,
  open,
  onOpenChange,
  onDelete,
}: StockDetailSheetProps) {
  const detail = useStockReport(open ? (report?.id ?? null) : null)
  const catalog = useStockCatalog()
  const data = detail.data ?? report
  // Khmer label per quantity key, e.g. cases → ចំនួនកេស
  const measureLabel = new Map(
    (catalog.data?.measures ?? []).map((m) => [m.key, m.kh])
  )

  // Group items by brand, keeping report order
  const brands = new Map<string, NonNullable<typeof data>['items']>()
  for (const item of data?.items ?? []) {
    brands.set(item.brandName, [...(brands.get(item.brandName) ?? []), item])
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full gap-0 sm:max-w-lg'>
        <SheetHeader className='border-b'>
          <SheetTitle>Stock Report</SheetTitle>
          <SheetDescription className='sr-only'>
            Stock quantities reported for an outlet
          </SheetDescription>
          {data && (
            <div className='pt-1'>
              <Button
                size='sm'
                variant='outline'
                className='text-destructive hover:text-destructive'
                onClick={() => onDelete(data)}
              >
                <Trash2 /> Delete
              </Button>
            </div>
          )}
        </SheetHeader>

        <div className='flex-1 overflow-y-auto px-4 py-5'>
          {data && (
            <div className='flex flex-col gap-5'>
              <dl className='grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm'>
                <dt className='text-muted-foreground'>Outlet</dt>
                <dd className='font-medium break-words'>{data.outlet.name}</dd>
                <dt className='text-muted-foreground'>Province</dt>
                <dd className='break-words'>{place(data.province)}</dd>
                <dt className='text-muted-foreground'>District</dt>
                <dd className='break-words'>{place(data.district)}</dd>
                <dt className='text-muted-foreground'>Commune</dt>
                <dd className='break-words'>{place(data.commune)}</dd>
                <dt className='text-muted-foreground'>Reported</dt>
                <dd>{formatDateTime(data.reportedAt)}</dd>
              </dl>

              <Separator />

              {detail.isPending ? (
                <Loader2 className='mx-auto size-5 animate-spin text-muted-foreground' />
              ) : (
                [...brands.entries()].map(([brandName, items]) => (
                  <section key={brandName} className='grid gap-2'>
                    <h3 className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                      {brandName}
                    </h3>
                    {/* One block per product, with only the quantities its brand counts */}
                    {items.map((item) => (
                      <div
                        key={item.productId}
                        className='overflow-hidden rounded-md border'
                      >
                        <p className='border-b bg-muted/50 px-3 py-2 text-sm font-medium'>
                          {item.productName}
                        </p>
                        <dl className='divide-y text-sm'>
                          {item.measures.map((key) => (
                            <div
                              key={key}
                              className='flex items-center justify-between gap-3 px-3 py-1.5'
                            >
                              <dt className='text-muted-foreground'>
                                {measureLabel.get(key) ?? key}
                              </dt>
                              <dd className='font-medium tabular-nums'>
                                {item[key].toLocaleString()}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ))}
                  </section>
                ))
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
