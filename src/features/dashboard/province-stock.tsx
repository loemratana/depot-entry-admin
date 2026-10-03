import { useState } from 'react'
import { AlertCircle, FileDown, Loader2, RotateCw, X } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { DatePicker } from '@/components/date-picker'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { fromIsoDate, toIsoDate } from '@/features/clients/lib/format'
import { ProvinceStockChart } from './components/province-stock-chart'
import { useProvinceStock } from './data/api'

type Period = { dateFrom?: string; dateTo?: string }

const periodLabel = ({ dateFrom, dateTo }: Period) =>
  dateFrom && dateTo
    ? `${dateFrom} → ${dateTo}`
    : dateFrom
      ? `From ${dateFrom}`
      : dateTo
        ? `Until ${dateTo}`
        : 'All time'

/** Dashboard › Stock by Province: stacked horizontal bars of cases per product */
export function ProvinceStock() {
  const [period, setPeriod] = useState<Period>({})
  const query = useProvinceStock(period)
  const grandTotal =
    query.data?.provinces.reduce((sum, p) => sum + p.total, 0) ?? 0
  const withStock = query.data?.provinces.filter((p) => p.total > 0).length ?? 0
  const totalOutlets =
    query.data?.provinces.reduce((sum, p) => sum + p.outlets, 0) ?? 0

  // One-page A4 landscape PDF of the chart, built in the browser
  const [exporting, setExporting] = useState(false)
  const exportPdf = async () => {
    if (!query.data) return
    setExporting(true)
    try {
      const { exportProvinceStockPdf } = await import('./lib/province-pdf')
      await exportProvinceStockPdf({
        data: query.data,
        period: periodLabel(period),
        summary: `${totalOutlets.toLocaleString()} outlet${totalOutlets === 1 ? '' : 's'} · ${withStock} of ${query.data.provinces.length} provinces with stock · ${grandTotal.toLocaleString()} cases in total`,
      })
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to export the PDF.'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center gap-2'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              Stock by Province
            </h2>
            <p className='text-muted-foreground'>
              ចំនួនកេស (cases) per province, by product · {periodLabel(period)}
            </p>
          </div>
          <Button
            variant='outline'
            onClick={exportPdf}
            disabled={exporting || !query.data || query.isPlaceholderData}
          >
            {exporting ? <Loader2 className='animate-spin' /> : <FileDown />}
            {exporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <div className='grid flex-1 grid-cols-2 gap-2 @xl/content:flex @xl/content:flex-none'>
            <DatePicker
              selected={fromIsoDate(period.dateFrom)}
              onSelect={(date) =>
                setPeriod((p) => ({ ...p, dateFrom: toIsoDate(date) }))
              }
              isDateDisabled={(date) =>
                !!period.dateTo && date > fromIsoDate(period.dateTo)!
              }
              placeholder='From date'
              aria-label='From date'
              className='w-full @xl/content:w-44'
            />
            <DatePicker
              selected={fromIsoDate(period.dateTo)}
              onSelect={(date) =>
                setPeriod((p) => ({ ...p, dateTo: toIsoDate(date) }))
              }
              isDateDisabled={(date) =>
                !!period.dateFrom && date < fromIsoDate(period.dateFrom)!
              }
              placeholder='To date'
              aria-label='To date'
              className='w-full @xl/content:w-44'
            />
          </div>
          {(period.dateFrom || period.dateTo) && (
            <Button
              variant='ghost'
              className='ms-auto'
              onClick={() => setPeriod({})}
            >
              <X /> Clear dates
            </Button>
          )}
        </div>

        <section className='rounded-xl border bg-card p-4'>
          {query.isPending ? (
            <Skeleton className='h-80 w-full' />
          ) : query.isError ? (
            <div className='flex flex-col items-center gap-2 p-8 text-sm'>
              <AlertCircle className='size-5 text-destructive' />
              {getErrorMessage(query.error, 'Unable to load the chart.')}
              <Button
                variant='outline'
                size='sm'
                onClick={() => query.refetch()}
              >
                <RotateCw /> Retry
              </Button>
            </div>
          ) : query.data.provinces.length === 0 ? (
            <p className='py-16 text-center text-sm text-muted-foreground'>
              មិនទាន់មានខេត្តទេ · No provinces yet.
            </p>
          ) : (
            <div
              className={cn(
                'grid gap-2 transition-opacity',
                query.isPlaceholderData && 'opacity-60'
              )}
            >
              <p className='text-sm text-muted-foreground'>
                <span className='font-semibold text-foreground tabular-nums'>
                  {totalOutlets.toLocaleString()}
                </span>{' '}
                outlet{totalOutlets === 1 ? '' : 's'} ·{' '}
                {grandTotal === 0
                  ? 'មិនមានស្តុកក្នុងរយៈពេលនេះទេ · No stock reported in this period.'
                  : `${withStock} of ${query.data.provinces.length} provinces with stock · `}
                {grandTotal > 0 && (
                  <>
                    <span className='font-semibold text-foreground tabular-nums'>
                      {grandTotal.toLocaleString()}
                    </span>{' '}
                    cases in total
                  </>
                )}
              </p>
              <ProvinceStockChart data={query.data} />
              <p className='text-xs text-muted-foreground'>
                ចំនួននីមួយៗជាចំនួនពិត · Every number is the real count. Very
                small segments are drawn a little wider so their number fits, so
                segment widths are not exactly to scale; totals at the end of
                each bar are exact.
              </p>
            </div>
          )}
        </section>
      </Main>
    </>
  )
}
