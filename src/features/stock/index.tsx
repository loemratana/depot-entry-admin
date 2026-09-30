import { Fragment, useEffect, useState } from 'react'
import {
  type PaginationState,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  AlertCircle,
  ChevronRight,
  Download,
  Eye,
  Loader2,
  Package,
  RotateCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTablePagination } from '@/components/data-table'
import { DatePicker } from '@/components/date-picker'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { WithTooltip } from '@/components/with-tooltip'
import { FilterCombobox } from '@/features/clients/components/filter-combobox'
import {
  useCommunes,
  useDistricts,
  useProvinces,
} from '@/features/clients/data/queries'
import { type LocationOption } from '@/features/clients/data/schema'
import {
  formatSubmittedAt,
  fromIsoDate,
  locationName,
  toIsoDate,
} from '@/features/clients/lib/format'
import { StockDetailSheet } from './components/stock-detail-sheet'
import {
  type Measure,
  type StockFilters,
  type StockReport,
  useDeleteStockReport,
  useExportStock,
  useStockCatalog,
  useStockReports,
} from './data/api'

const SEARCH_DEBOUNCE_MS = 400

/** Products that have at least one quantity above 0 */
const stockedCount = (items: StockReport['items']) =>
  items.filter((item) => item.measures.some((key) => item[key] > 0)).length

/**
 * Small solid #5027F5 button in the Products column. It opens a popup listing
 * each product that has stock with its quantities; all-zero products are left out.
 */
function ProductsPopover({
  outletName,
  items,
  measureLabel,
}: {
  outletName: string
  items: StockReport['items']
  measureLabel: Map<string, string>
}) {
  const stocked = items
    .map((item) => ({
      item,
      counts: item.measures.filter((key) => item[key] > 0),
    }))
    .filter(({ counts }) => counts.length > 0)

  return (
    <Popover>
      <WithTooltip label='View products'>
        <PopoverTrigger asChild>
          <Button
            size='sm'
            // The row click expands the row; this button only opens the popup
            onClick={(e) => e.stopPropagation()}
            aria-label={`View products of ${outletName}`}
            className='h-7 gap-1 rounded-md bg-[#5027F5] px-2 text-xs text-white hover:bg-[#4119d9] focus-visible:ring-[#5027F5]/40'
          >
            <Package className='size-3.5' />
            <span className='tabular-nums'>{stocked.length}</span>
          </Button>
        </PopoverTrigger>
      </WithTooltip>
      <PopoverContent
        align='start'
        className='w-80'
        onClick={(e) => e.stopPropagation()}
      >
        <p className='mb-2 text-sm font-semibold'>{outletName}</p>
        <ul className='grid max-h-80 gap-2 overflow-y-auto text-sm'>
          {stocked.map(({ item, counts }) => (
            <li key={item.productId} className='rounded-md border px-3 py-2'>
              <span className='font-medium'>{item.productName}</span>
              <dl className='mt-1 grid gap-0.5 text-xs'>
                {counts.map((key) => (
                  <div key={key} className='flex justify-between gap-3'>
                    <dt className='text-muted-foreground'>
                      {measureLabel.get(key) ?? key}
                    </dt>
                    <dd className='font-medium tabular-nums'>
                      {item[key].toLocaleString()}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Expanded row: a table with one row per product and one column per quantity.
 * A quantity the product's brand does not count shows "—" (wedding beer: cases only).
 */
function ExpandedProducts({
  items,
  measures,
}: {
  items: StockReport['items']
  measures: Measure[]
}) {
  return (
    <div className='overflow-x-auto bg-background'>
      <table className='w-full text-sm'>
        <thead className='bg-[#5027F5] text-xs text-white'>
          <tr>
            <th className='px-3 py-2 text-start font-medium'>Brand</th>
            <th className='px-3 py-2 text-start font-medium'>Product</th>
            {measures.map((m) => (
              <th
                key={m.key}
                className='px-3 py-2 text-end font-medium whitespace-nowrap'
              >
                {m.kh}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.productId} className='border-t'>
              <td className='px-3 py-2 text-muted-foreground'>
                {item.brandName}
              </td>
              <td className='px-3 py-2 font-medium'>{item.productName}</td>
              {measures.map((m) => (
                <td key={m.key} className='px-3 py-2 text-end tabular-nums'>
                  {item.measures.includes(m.key) ? (
                    <span
                      className={cn(
                        item[m.key] > 0
                          ? 'font-semibold'
                          : 'text-muted-foreground'
                      )}
                    >
                      {item[m.key].toLocaleString()}
                    </span>
                  ) : (
                    <span className='text-muted-foreground'>—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const toOptions = (items: LocationOption[] | undefined) =>
  items?.map((item) => ({
    value: item.id,
    label: item.nameEn || item.nameKh,
    description: item.nameEn && item.nameKh ? item.nameKh : undefined,
  }))

export function StockReports() {
  const [filters, setFilters] = useState<StockFilters>({})
  const [searchInput, setSearchInput] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })
  const [selected, setSelected] = useState<StockReport | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [toDelete, setToDelete] = useState<StockReport | null>(null)
  // Rows opened to show their products
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const update = (patch: Partial<StockFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  // Debounced search on outlet name
  useEffect(() => {
    const timeout = setTimeout(() => {
      const next = searchInput.trim() || undefined
      if (next !== filters.search) update({ search: next })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
    // update is recreated each render; only react to the typed text
  }, [searchInput, filters.search])

  const provinces = useProvinces()
  const districts = useDistricts(filters.provinceId)
  const communes = useCommunes(filters.districtId, filters.provinceId)
  const catalog = useStockCatalog()
  // Khmer label per quantity key, e.g. cases → ចំនួនកេស
  const measures = catalog.data?.measures ?? []
  const measureLabel = new Map(measures.map((m) => [m.key, m.kh]))

  const query = useStockReports({
    ...filters,
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
  })
  const rows = query.data?.data ?? []
  const meta = query.data?.pagination
  const exportStock = useExportStock()
  const deleteReport = useDeleteStockReport()

  // Only used for its pagination state/controls
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<StockReport>({
    data: rows,
    columns: [],
    state: { pagination },
    onPaginationChange: setPagination,
    manualPagination: true,
    pageCount: Math.max(meta?.totalPages ?? 1, 1),
    getCoreRowModel: getCoreRowModel(),
  })

  const hasFilters = Object.values(filters).some(Boolean)
  // Expand, Outlet, Province, District/Commune, Products, Reported At, Actions
  const columnCount = 7
  const first = meta && meta.total ? (meta.page - 1) * meta.limit + 1 : 0
  const last = meta ? Math.min(meta.page * meta.limit, meta.total) : 0
  const view = (report: StockReport) => {
    setSelected(report)
    setSheetOpen(true)
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
            <h2 className='text-2xl font-bold tracking-tight'>Stock</h2>
            <p className='text-muted-foreground'>
              Stock quantities reported by outlets
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              onClick={() => exportStock.mutate(filters)}
              disabled={exportStock.isPending}
            >
              {exportStock.isPending ? (
                <Loader2 className='animate-spin' />
              ) : (
                <Download />
              )}
              {exportStock.isPending ? 'Exporting...' : 'Export Excel'}
            </Button>
          </div>
        </div>

        <div className='flex flex-col gap-3'>
          <div className='relative'>
            <Search className='absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder='Search outlet name...'
              className='ps-9'
              aria-label='Search outlets'
            />
          </div>
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
              <DatePicker
                selected={fromIsoDate(filters.dateFrom)}
                onSelect={(date) => update({ dateFrom: toIsoDate(date) })}
                isDateDisabled={(date) =>
                  !!filters.dateTo && date > fromIsoDate(filters.dateTo)!
                }
                placeholder='From date'
                className='w-full @xl/content:w-44'
              />
              <DatePicker
                selected={fromIsoDate(filters.dateTo)}
                onSelect={(date) => update({ dateTo: toIsoDate(date) })}
                isDateDisabled={(date) =>
                  !!filters.dateFrom && date < fromIsoDate(filters.dateFrom)!
                }
                placeholder='To date'
                className='w-full @xl/content:w-44'
              />
            </div>
            {hasFilters && (
              <Button
                variant='ghost'
                className='ms-auto'
                onClick={() => {
                  setFilters({})
                  setSearchInput('')
                  setPagination((p) => ({ ...p, pageIndex: 0 }))
                }}
              >
                <X /> Clear filters
              </Button>
            )}
          </div>
        </div>

        <div
          className={cn(
            'overflow-x-auto rounded-md border transition-opacity',
            query.isFetching && query.isPlaceholderData && 'opacity-60'
          )}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-10'>
                  <span className='sr-only'>Expand</span>
                </TableHead>
                <TableHead>Outlet</TableHead>
                <TableHead className='hidden @2xl/content:table-cell'>
                  Province
                </TableHead>
                <TableHead className='hidden @4xl/content:table-cell'>
                  District / Commune
                </TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Reported At</TableHead>
                <TableHead className='w-20'>
                  <span className='sr-only'>Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                Array.from({ length: 6 }, (_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: columnCount }, (_, j) => (
                      <TableCell key={j}>
                        <Skeleton className='h-5 w-full' />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : query.isError ? (
                <TableRow>
                  <TableCell colSpan={columnCount} className='h-32 text-center'>
                    <div className='flex flex-col items-center gap-2'>
                      <AlertCircle className='size-5 text-destructive' />
                      <span className='text-sm'>
                        {getErrorMessage(
                          query.error,
                          'Unable to load stock reports.'
                        )}
                      </span>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => query.refetch()}
                      >
                        <RotateCw /> Retry
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columnCount}
                    className='h-32 text-center text-sm text-muted-foreground'
                  >
                    {hasFilters
                      ? 'No stock reports match the selected filters.'
                      : 'No stock reports yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const reported = formatSubmittedAt(row.reportedAt)
                  const open = expanded.has(row.id)
                  const count = stockedCount(row.items)
                  return (
                    <Fragment key={row.id}>
                      <TableRow
                        className={cn(
                          'cursor-pointer',
                          open && 'border-b-0 bg-muted/40'
                        )}
                        // Clicking a row expands it; the eye icon opens the full detail panel
                        onClick={() => toggle(row.id)}
                        data-state={open ? 'open' : 'closed'}
                      >
                        <TableCell className='w-10 pe-0'>
                          <WithTooltip label={open ? 'Collapse' : 'Expand'}>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-7'
                              onClick={(e) => {
                                e.stopPropagation()
                                toggle(row.id)
                              }}
                              aria-expanded={open}
                              aria-label={`${open ? 'Collapse' : 'Expand'} ${row.outlet.name}`}
                            >
                              <ChevronRight
                                className={cn(
                                  'transition-transform',
                                  open && 'rotate-90'
                                )}
                              />
                            </Button>
                          </WithTooltip>
                        </TableCell>
                        <TableCell className='font-medium'>
                          {row.outlet.name}
                        </TableCell>
                        <TableCell className='hidden @2xl/content:table-cell'>
                          {locationName(row.province)}
                        </TableCell>
                        <TableCell className='hidden @4xl/content:table-cell'>
                          <span className='block'>
                            {locationName(row.district)}
                          </span>
                          <span className='block text-xs text-muted-foreground'>
                            {locationName(row.commune)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {count > 0 ? (
                            <ProductsPopover
                              outletName={row.outlet.name}
                              items={row.items}
                              measureLabel={measureLabel}
                            />
                          ) : (
                            <span className='text-sm text-muted-foreground'>
                              No stock
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {reported && (
                            <>
                              <span className='block text-nowrap'>
                                {reported.date}
                              </span>
                              <span className='block text-xs text-muted-foreground'>
                                {reported.time}
                              </span>
                            </>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className='flex justify-end gap-1'>
                            <WithTooltip label='View details'>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='size-8'
                                onClick={() => view(row)}
                                aria-label={`View stock report of ${row.outlet.name}`}
                              >
                                <Eye />
                              </Button>
                            </WithTooltip>
                            <WithTooltip label='Delete'>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='size-8 text-destructive hover:text-destructive'
                                onClick={() => setToDelete(row)}
                                aria-label={`Delete stock report of ${row.outlet.name}`}
                              >
                                <Trash2 />
                              </Button>
                            </WithTooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                      {open && (
                        <TableRow className='bg-muted/40 hover:bg-muted/40'>
                          <TableCell
                            colSpan={columnCount}
                            className='p-0 whitespace-normal'
                          >
                            <ExpandedProducts
                              items={row.items}
                              measures={measures}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {meta && meta.total > 0 && (
          <DataTablePagination
            table={table}
            summary={`Showing ${first.toLocaleString()}–${last.toLocaleString()} of ${meta.total.toLocaleString()}`}
          />
        )}
      </Main>

      <StockDetailSheet
        report={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onDelete={setToDelete}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) =>
          !open && !deleteReport.isPending && setToDelete(null)
        }
        title={`Delete this stock report of "${toDelete?.outlet.name}"?`}
        desc='This cannot be undone.'
        confirmText='Delete'
        destructive
        isLoading={deleteReport.isPending}
        handleConfirm={() =>
          toDelete &&
          deleteReport.mutate(toDelete.id, {
            onSuccess: () => {
              toast.success('Stock report deleted')
              if (selected?.id === toDelete.id) setSheetOpen(false)
            },
            onSettled: () => setToDelete(null),
          })
        }
      />
    </>
  )
}
