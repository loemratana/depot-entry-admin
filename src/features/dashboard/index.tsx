import { useState } from 'react'
import {
  AlertCircle,
  Boxes,
  CalendarCheck,
  Package,
  RotateCw,
  Store,
  X,
} from 'lucide-react'
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
import { useStockCatalog } from '@/features/stock/data/api'
import {
  type DashboardFilters,
  type ProductTotal,
  useDashboard,
} from './data/api'

// Solid card colours (white text); product cards cycle through the palette
const OUTLET_COLORS = { today: 'bg-[#5027F5]', total: 'bg-emerald-600' }
const PRODUCT_COLORS = [
  'bg-sky-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-violet-600',
  'bg-teal-600',
  'bg-orange-600',
  'bg-indigo-600',
  'bg-fuchsia-600',
  'bg-cyan-700',
  'bg-lime-700',
]

const toOptions = (items: LocationOption[] | undefined) =>
  items?.map((item) => ({
    value: item.id,
    label: item.nameEn || item.nameKh,
    description: item.nameEn && item.nameKh ? item.nameKh : undefined,
  }))

const number = (value: number) => value.toLocaleString()

function StatCard({
  className,
  icon,
  label,
  value,
  footer,
  children,
}: {
  className: string
  icon: React.ReactNode
  label: string
  value: number
  footer?: string
  children?: React.ReactNode
}) {
  return (
    <section
      aria-label={label}
      className={cn(
        'flex min-h-36 flex-col gap-3 rounded-xl p-4 text-white shadow-sm',
        className
      )}
    >
      <div className='flex items-start justify-between gap-3'>
        <p className='text-sm leading-snug font-medium text-white/90'>
          {label}
        </p>
        {icon}
      </div>
      <p className='text-3xl font-bold tracking-tight tabular-nums'>
        {number(value)}
      </p>
      {children}
      {footer && (
        <p className='mt-auto text-xs text-white/80 tabular-nums'>{footer}</p>
      )}
    </section>
  )
}

/** Icon on a translucent square, the same on every card */
function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/20'>
      {children}
    </span>
  )
}

function ProductCard({
  product,
  color,
  measureLabel,
}: {
  product: ProductTotal
  color: string
  measureLabel: Map<string, string>
}) {
  // The big number is cases; the other fields this brand counts are listed below
  const main = product.measures.includes('cases')
    ? 'cases'
    : product.measures[0]
  const others = product.measures.filter((key) => key !== main)
  return (
    <StatCard
      className={color}
      label={`Total ${product.shortName}`}
      value={product.totals[main] ?? 0}
      icon={
        <IconBadge>
          <Package className='size-5' />
        </IconBadge>
      }
      footer={`${measureLabel.get(main) ?? main} · ${number(product.outlets)} outlet${product.outlets === 1 ? '' : 's'}`}
    >
      {others.length > 0 && (
        <dl className='grid gap-0.5 text-xs'>
          {others.map((key) => (
            <div key={key} className='flex justify-between gap-2'>
              <dt className='truncate text-white/80'>
                {measureLabel.get(key) ?? key}
              </dt>
              <dd className='font-semibold tabular-nums'>
                {number(product.totals[key] ?? 0)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </StatCard>
  )
}

const periodLabel = ({ dateFrom, dateTo }: DashboardFilters) =>
  dateFrom && dateTo
    ? `${formatFilterDate(dateFrom)} → ${formatFilterDate(dateTo)}`
    : dateFrom
      ? `From ${formatFilterDate(dateFrom)}`
      : dateTo
        ? `Until ${formatFilterDate(dateTo)}`
        : 'All time'

/** Outlet and stock totals, filtered by location and period */
export function Dashboard() {
  const [filters, setFilters] = useState<DashboardFilters>({})
  const update = (patch: Partial<DashboardFilters>) =>
    setFilters((prev) => ({ ...prev, ...patch }))
  const hasFilters = Object.values(filters).some(Boolean)

  const provinces = useProvinces()
  const districts = useDistricts(filters.provinceId)
  const communes = useCommunes(filters.districtId, filters.provinceId)
  const catalog = useStockCatalog()
  const measureLabel = new Map(
    (catalog.data?.measures ?? []).map((m) => [m.key, m.kh])
  )

  const query = useDashboard(filters)
  const period = periodLabel(filters)

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
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Dashboard</h2>
          <p className='text-muted-foreground'>
            Outlets and stock totals · {period}
          </p>
        </div>

        <div className='flex flex-col gap-2'>
          <div className='grid grid-cols-1 gap-2 @xl/content:grid-cols-3'>
            <FilterCombobox
              label='Province'
              allLabel='All provinces'
              searchPlaceholder='Search province...'
              options={toOptions(provinces.data)}
              value={filters.provinceId}
              isLoading={provinces.isLoading}
              isError={provinces.isError}
              onChange={(value) =>
                update({
                  provinceId: value,
                  districtId: undefined,
                  communeId: undefined,
                })
              }
            />
            <FilterCombobox
              label='District'
              allLabel='All districts'
              searchPlaceholder='Search district...'
              options={toOptions(districts.data)}
              value={filters.districtId}
              disabled={!filters.provinceId}
              disabledHint='Select a province first'
              isLoading={districts.isLoading}
              isError={districts.isError}
              onChange={(value) =>
                update({ districtId: value, communeId: undefined })
              }
            />
            <FilterCombobox
              label='Commune'
              allLabel='All communes'
              searchPlaceholder='Search commune...'
              options={toOptions(communes.data)}
              value={filters.communeId}
              disabled={!filters.districtId}
              disabledHint='Select a district first'
              isLoading={communes.isLoading}
              isError={communes.isError}
              onChange={(value) => update({ communeId: value })}
            />
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <div className='grid flex-1 grid-cols-2 gap-2 @xl/content:flex @xl/content:flex-none'>
              <DateTimePicker
                value={filters.dateFrom}
                onChange={(value) => update({ dateFrom: value })}
                max={filters.dateTo}
                placeholder='From date'
                aria-label='From date'
                className='w-full @xl/content:w-56'
              />
              <DateTimePicker
                value={filters.dateTo}
                onChange={(value) => update({ dateTo: value })}
                min={filters.dateFrom}
                placeholder='To date'
                aria-label='To date'
                className='w-full @xl/content:w-56'
              />
            </div>
            {hasFilters && (
              <Button
                variant='ghost'
                className='ms-auto'
                onClick={() => setFilters({})}
              >
                <X /> Clear filters
              </Button>
            )}
          </div>
        </div>

        {query.isPending ? (
          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className='h-36 rounded-xl' />
            ))}
          </div>
        ) : query.isError ? (
          <div className='flex flex-col items-center gap-2 rounded-md border border-dashed p-8 text-sm'>
            <AlertCircle className='size-5 text-destructive' />
            {getErrorMessage(query.error, 'Unable to load the dashboard.')}
            <Button variant='outline' size='sm' onClick={() => query.refetch()}>
              <RotateCw /> Retry
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              'grid gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-4',
              query.isPlaceholderData && 'opacity-60'
            )}
          >
            <StatCard
              className={OUTLET_COLORS.today}
              label='Today outlet'
              value={query.data.todayOutlets}
              icon={
                <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/20'>
                  <CalendarCheck className='size-5' />
                </span>
              }
              footer='Added today (Cambodia time)'
            />
            <StatCard
              className={OUTLET_COLORS.total}
              label='Total outlet'
              value={query.data.totalOutlets}
              icon={
                <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/20'>
                  <Store className='size-5' />
                </span>
              }
              footer={period}
            />
            {query.data.totalStock && (
              <StatCard
                className='bg-slate-800'
                label='Total stock'
                value={query.data.totalStock.cases}
                icon={
                  <IconBadge>
                    <Boxes className='size-5' />
                  </IconBadge>
                }
                footer={`${measureLabel.get('cases') ?? 'cases'} · all products · ${number(query.data.totalStock.outlets)} outlet${query.data.totalStock.outlets === 1 ? '' : 's'}`}
              />
            )}
            {query.data.products?.map((product, index) => (
              <ProductCard
                key={product.productId}
                product={product}
                color={PRODUCT_COLORS[index % PRODUCT_COLORS.length]}
                measureLabel={measureLabel}
              />
            ))}
          </div>
        )}
      </Main>
    </>
  )
}
