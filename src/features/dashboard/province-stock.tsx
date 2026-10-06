import { useState } from 'react'
import { AlertCircle, FileDown, Loader2, RotateCw, X } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { DateTimePicker } from '@/components/date-time-picker'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { FilterCombobox } from '@/features/clients/components/filter-combobox'
import {
  useCommunes,
  useDistricts,
  useProvinces,
} from '@/features/clients/data/queries'
import { type LocationOption } from '@/features/clients/data/schema'
import { formatFilterDate } from '@/features/clients/lib/format'
import { ProvinceStockChart } from './components/province-stock-chart'
import { type ProvinceStockFilters, useProvinceStock } from './data/api'

type Period = { dateFrom?: string; dateTo?: string }

const toOptions = (items: LocationOption[] | undefined) =>
  items?.map((item) => ({
    value: item.id,
    label: item.nameEn || item.nameKh,
    description: item.nameEn && item.nameKh ? item.nameKh : undefined,
  }))

// What each bar is, by how far the location filter goes
const PLACE_WORDS = {
  province: { kh: 'ខេត្ត', one: 'province', many: 'provinces' },
  district: { kh: 'ស្រុក/ខណ្ឌ', one: 'district', many: 'districts' },
  commune: { kh: 'ឃុំ/សង្កាត់', one: 'commune', many: 'communes' },
} as const

const periodLabel = ({ dateFrom, dateTo }: Period) =>
  dateFrom && dateTo
    ? `${formatFilterDate(dateFrom)} → ${formatFilterDate(dateTo)}`
    : dateFrom
      ? `From ${formatFilterDate(dateFrom)}`
      : dateTo
        ? `Until ${formatFilterDate(dateTo)}`
        : 'All time'

/**
 * Dashboard › Stock by Province: stacked horizontal bars of cases per product.
 * Choosing a province shows its districts, a district its communes.
 */
export function ProvinceStock() {
  const [period, setPeriod] = useState<ProvinceStockFilters>({})
  const query = useProvinceStock(period)
  const provincesList = useProvinces()
  const districtsList = useDistricts(period.provinceId)
  const communesList = useCommunes(period.districtId, period.provinceId)
  const words = PLACE_WORDS[query.data?.level ?? 'province']
  // "Phnom Penh · Chamkar Mon" for the chosen place, shown with the period
  const place = [
    provincesList.data?.find((p) => p.id === period.provinceId),
    districtsList.data?.find((d) => d.id === period.districtId),
    communesList.data?.find((c) => c.id === period.communeId),
  ]
    .filter(Boolean)
    .map((item) => item!.nameEn || item!.nameKh)
    .join(' · ')
  const hasFilters = Object.values(period).some(Boolean)
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
        period: [place, periodLabel(period)].filter(Boolean).join(' · '),
        unit: words.one,
        summary: `${totalOutlets.toLocaleString()} outlet${totalOutlets === 1 ? '' : 's'} · ${withStock} of ${query.data.provinces.length} ${words.many} with stock · ${grandTotal.toLocaleString()} cases in total`,
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
              ចំនួនកេស (cases) per {words.one}, by product ·{' '}
              {place && <>{place} · </>}
              {periodLabel(period)}
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

        <div className='grid grid-cols-1 gap-2 @xl/content:grid-cols-3'>
          <FilterCombobox
            label='Province'
            allLabel='All provinces'
            searchPlaceholder='Search province...'
            options={toOptions(provincesList.data)}
            value={period.provinceId}
            isLoading={provincesList.isLoading}
            isError={provincesList.isError}
            onChange={(value) =>
              setPeriod((p) => ({
                ...p,
                provinceId: value,
                districtId: undefined,
                communeId: undefined,
              }))
            }
          />
          <FilterCombobox
            label='District'
            allLabel='All districts'
            searchPlaceholder='Search district...'
            options={toOptions(districtsList.data)}
            value={period.districtId}
            disabled={!period.provinceId}
            disabledHint='Select a province first'
            isLoading={districtsList.isLoading}
            isError={districtsList.isError}
            onChange={(value) =>
              setPeriod((p) => ({
                ...p,
                districtId: value,
                communeId: undefined,
              }))
            }
          />
          <FilterCombobox
            label='Commune'
            allLabel='All communes'
            searchPlaceholder='Search commune...'
            options={toOptions(communesList.data)}
            value={period.communeId}
            disabled={!period.districtId}
            disabledHint='Select a district first'
            isLoading={communesList.isLoading}
            isError={communesList.isError}
            onChange={(value) => setPeriod((p) => ({ ...p, communeId: value }))}
          />
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <div className='grid flex-1 grid-cols-2 gap-2 @xl/content:flex @xl/content:flex-none'>
            <DateTimePicker
              value={period.dateFrom}
              onChange={(value) =>
                setPeriod((p) => ({ ...p, dateFrom: value }))
              }
              max={period.dateTo}
              placeholder='From date'
              aria-label='From date'
              className='w-full @xl/content:w-56'
            />
            <DateTimePicker
              value={period.dateTo}
              onChange={(value) => setPeriod((p) => ({ ...p, dateTo: value }))}
              min={period.dateFrom}
              placeholder='To date'
              aria-label='To date'
              className='w-full @xl/content:w-56'
            />
          </div>
          {hasFilters && (
            <Button
              variant='ghost'
              className='ms-auto'
              onClick={() => setPeriod({})}
            >
              <X /> Clear filters
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
              មិនទាន់មាន{words.kh}ទេ · No {words.many} yet.
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
                  : `${withStock} of ${query.data.provinces.length} ${words.many} with stock · `}
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
