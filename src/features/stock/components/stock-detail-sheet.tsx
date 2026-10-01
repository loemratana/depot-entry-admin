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
import { BrandStockTables } from './brand-stock-tables'

type StockDetailSheetProps = {
  report: StockReport | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Shows a Delete button when given */
  onDelete?: (report: StockReport) => void
  /** The report is still being looked up (e.g. opened from an outlet) */
  isLoading?: boolean
  /** Shown when there is no report to show */
  emptyText?: string
}

const place = (named: { nameKh: string; nameEn: string }) =>
  named.nameEn ? `${named.nameKh} (${named.nameEn})` : named.nameKh

export function StockDetailSheet({
  report,
  open,
  onOpenChange,
  onDelete,
  isLoading,
  emptyText,
}: StockDetailSheetProps) {
  const detail = useStockReport(open ? (report?.id ?? null) : null)
  const catalog = useStockCatalog()
  const data = detail.data ?? report
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full gap-0 sm:max-w-2xl'>
        <SheetHeader className='border-b'>
          <SheetTitle>Stock Report</SheetTitle>
          <SheetDescription className='sr-only'>
            Stock quantities reported for an outlet
          </SheetDescription>
          {data && onDelete && (
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
          {isLoading && !data && (
            <Loader2 className='mx-auto size-5 animate-spin text-muted-foreground' />
          )}
          {!isLoading && !data && emptyText && (
            <p className='py-10 text-center text-sm text-muted-foreground'>
              {emptyText}
            </p>
          )}
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
                data && (
                  // Same per-brand tables as the expanded row: only each brand's fields
                  <BrandStockTables
                    items={data.items}
                    measures={catalog.data?.measures ?? []}
                    className='p-0'
                  />
                )
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
