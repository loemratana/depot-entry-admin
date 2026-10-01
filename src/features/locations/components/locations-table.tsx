import { useEffect, useState } from 'react'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  type PaginationState,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCw,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/handle-server-error'
import { useCan } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTablePagination } from '@/components/data-table'
import { SolidIcon } from '@/components/solid-icon'
import { WithTooltip } from '@/components/with-tooltip'
import { FilterCombobox } from '@/features/clients/components/filter-combobox'
import { useProvinces } from '@/features/clients/data/queries'
import {
  type LocationLevel,
  type LocationRef,
  type LocationRow,
  deleteLocation,
  getLocationRows,
  updateLocation,
} from '../data/api'
import { LEVEL_LABEL } from '../lib/levels'
import { LocationDialog, type LocationDialogState } from './location-dialog'

const SEARCH_DEBOUNCE_MS = 400
const COLUMN_COUNT = 5

type Target = { level: LocationLevel; item: LocationRef }

function Name({ item }: { item: LocationRef | null }) {
  if (!item) return <span className='text-muted-foreground'>—</span>
  return (
    <div className={cn(!item.isActive && 'opacity-60')}>
      <span className='block leading-relaxed'>{item.nameKh}</span>
      {item.nameEn && (
        <span className='block text-xs font-normal text-muted-foreground'>
          {item.nameEn}
        </span>
      )}
      {!item.isActive && (
        <Badge variant='outline' className='mt-1'>
          Inactive
        </Badge>
      )}
    </div>
  )
}

/** Actions for one level of a row (edit, activate/deactivate, delete) */
function LevelActions({
  target,
  onEdit,
  onToggle,
  onDelete,
}: {
  target: Target
  onEdit: (target: Target) => void
  onToggle: (target: Target) => void
  onDelete: (target: Target) => void
}) {
  const label = LEVEL_LABEL[target.level].en
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel className='text-xs text-muted-foreground'>
        {label}: {target.item.nameKh}
      </DropdownMenuLabel>
      <DropdownMenuItem onSelect={() => onEdit(target)}>
        <SolidIcon icon={Pencil} className='bg-amber-500' />
        Edit
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onToggle(target)}>
        <SolidIcon
          icon={target.item.isActive ? Ban : CheckCircle2}
          className={target.item.isActive ? 'bg-sky-600' : 'bg-emerald-600'}
        />
        {target.item.isActive ? 'Deactivate' : 'Activate'}
      </DropdownMenuItem>
      <DropdownMenuItem variant='destructive' onSelect={() => onDelete(target)}>
        <SolidIcon icon={Trash2} className='bg-red-600' />
        Delete
      </DropdownMenuItem>
    </DropdownMenuGroup>
  )
}

/** Province / district / commune rows sorted by province, with CRUD actions */
export function LocationsTable() {
  const queryClient = useQueryClient()
  const canManage = useCan()('locations.manage')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [provinceId, setProvinceId] = useState<string>()
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })
  const [dialog, setDialog] = useState<LocationDialogState | null>(null)
  const [toDelete, setToDelete] = useState<Target | null>(null)

  // Debounced search; any filter change returns to the first page
  useEffect(() => {
    const timeout = setTimeout(() => {
      const next = searchInput.trim()
      if (next !== search) {
        setSearch(next)
        setPagination((p) => ({ ...p, pageIndex: 0 }))
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [searchInput, search])

  const provinces = useProvinces()

  const query = useQuery({
    queryKey: [
      'locations',
      'table',
      {
        search,
        provinceId,
        page: pagination.pageIndex,
        limit: pagination.pageSize,
      },
    ],
    queryFn: ({ signal }) =>
      getLocationRows(
        {
          search: search || undefined,
          provinceId,
          page: pagination.pageIndex + 1,
          limit: pagination.pageSize,
        },
        signal
      ),
    placeholderData: keepPreviousData,
  })

  const refreshLocations = () =>
    queryClient.invalidateQueries({ queryKey: ['locations'] })

  const toggle = useMutation({
    mutationFn: ({ level, item }: Target) =>
      updateLocation(level, item.id, { isActive: !item.isActive }),
    onSuccess: (updated, { level }) => {
      refreshLocations()
      toast.success(
        `${LEVEL_LABEL[level].en} ${updated.isActive ? 'activated' : 'deactivated'}`,
        { description: updated.nameKh }
      )
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Unable to update the location.')),
  })

  const remove = useMutation({
    mutationFn: ({ level, item }: Target) => deleteLocation(level, item.id),
    onSuccess: (_, { level, item }) => {
      refreshLocations()
      toast.success(`${LEVEL_LABEL[level].en} deleted`, {
        description: item.nameKh,
      })
      setToDelete(null)
    },
    // The backend explains why (still has children / used by submissions)
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Unable to delete the location.'))
      setToDelete(null)
    },
  })

  const rows = query.data?.data ?? []
  const meta = query.data?.pagination

  // Only used for its pagination state/controls
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<LocationRow>({
    data: rows,
    columns: [],
    state: { pagination },
    onPaginationChange: setPagination,
    manualPagination: true,
    pageCount: Math.max(meta?.totalPages ?? 1, 1),
    getCoreRowModel: getCoreRowModel(),
  })

  const hasFilters = !!search || !!provinceId
  const first = meta && meta.total ? (meta.page - 1) * meta.limit + 1 : 0
  const last = meta ? Math.min(meta.page * meta.limit, meta.total) : 0

  const edit = (row: LocationRow) => (target: Target) =>
    setDialog({
      mode: 'edit',
      level: target.level,
      item: target.item,
      parentLabel:
        target.level === 'communes'
          ? `${row.province.nameKh} › ${row.district?.nameKh}`
          : target.level === 'districts'
            ? row.province.nameKh
            : undefined,
    })

  return (
    <div className='grid gap-4'>
      <div className='flex flex-col gap-2 sm:flex-row'>
        <div className='relative flex-1'>
          <Search className='absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder='Search province, district or commune...'
            className='ps-9'
            aria-label='Search locations'
          />
        </div>
        <FilterCombobox
          label='Province'
          allLabel='All provinces'
          searchPlaceholder='Search province...'
          className='sm:w-64'
          options={provinces.data?.map((p) => ({
            value: p.id,
            label: p.nameKh || p.nameEn,
            description: p.nameKh && p.nameEn ? p.nameEn : undefined,
          }))}
          value={provinceId}
          onChange={(value) => {
            setProvinceId(value)
            setPagination((p) => ({ ...p, pageIndex: 0 }))
          }}
          isLoading={provinces.isLoading}
          isError={provinces.isError}
        />
        {canManage && (
          <Button onClick={() => setDialog({ mode: 'create', provinceId })}>
            <Plus /> Add location
          </Button>
        )}
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
              <TableHead className='w-1/4'>Province · ខេត្ត/ក្រុង</TableHead>
              <TableHead className='w-1/4'>District · ខណ្ឌ/ស្រុក</TableHead>
              <TableHead>Commune · ឃុំ/ភូមិ</TableHead>
              <TableHead className='w-24 text-end'>Status</TableHead>
              <TableHead className='w-12'>
                <span className='sr-only'>Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              Array.from({ length: 8 }, (_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: COLUMN_COUNT }, (_, j) => (
                    <TableCell key={j}>
                      <Skeleton className='h-5 w-full' />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : query.isError ? (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className='h-32 text-center'>
                  <div className='flex flex-col items-center gap-2'>
                    <AlertCircle className='size-5 text-destructive' />
                    <span className='text-sm'>
                      {getErrorMessage(
                        query.error,
                        'Unable to load locations.'
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
                  colSpan={COLUMN_COUNT}
                  className='h-32 text-center text-sm text-muted-foreground'
                >
                  {hasFilters
                    ? 'No locations match the search.'
                    : 'No locations yet. Add one, or upload an Excel file in the Upload tab.'}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                // The row's status is its most specific level
                const own = row.commune ?? row.district ?? row.province
                const handlers = {
                  onEdit: edit(row),
                  onToggle: (target: Target) => toggle.mutate(target),
                  onDelete: setToDelete,
                }
                return (
                  <TableRow key={row.id}>
                    {/* Only the Province column has a solid background */}
                    <TableCell
                      data-province
                      className='bg-slate-200 font-semibold dark:bg-slate-800'
                    >
                      <Name item={row.province} />
                    </TableCell>
                    <TableCell>
                      <Name item={row.district} />
                    </TableCell>
                    <TableCell>
                      <Name item={row.commune} />
                    </TableCell>
                    <TableCell className='text-end'>
                      {own.isActive ? (
                        <Badge variant='secondary'>Active</Badge>
                      ) : (
                        <Badge variant='outline'>Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {canManage && (
                        <DropdownMenu modal={false}>
                          <WithTooltip label='Actions'>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size='icon'
                                className='size-8 bg-[#5027F5] text-white hover:bg-[#4119d9]'
                                aria-label={`Actions for ${own.nameKh}`}
                              >
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                          </WithTooltip>
                          <DropdownMenuContent align='end' className='w-60'>
                            {row.commune && (
                              <>
                                <LevelActions
                                  target={{
                                    level: 'communes',
                                    item: row.commune,
                                  }}
                                  {...handlers}
                                />
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {row.district && (
                              <>
                                <LevelActions
                                  target={{
                                    level: 'districts',
                                    item: row.district,
                                  }}
                                  {...handlers}
                                />
                                <DropdownMenuItem
                                  onSelect={() =>
                                    setDialog({
                                      mode: 'create',
                                      level: 'communes',
                                      provinceId: row.province.id,
                                      districtId: row.district!.id,
                                    })
                                  }
                                >
                                  <SolidIcon
                                    icon={Plus}
                                    className='bg-[#5027F5]'
                                  />
                                  Add commune here
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <LevelActions
                              target={{
                                level: 'provinces',
                                item: row.province,
                              }}
                              {...handlers}
                            />
                            <DropdownMenuItem
                              onSelect={() =>
                                setDialog({
                                  mode: 'create',
                                  level: 'districts',
                                  provinceId: row.province.id,
                                })
                              }
                            >
                              <SolidIcon icon={Plus} className='bg-[#5027F5]' />
                              Add district here
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {meta && meta.total > 0 && (
        <DataTablePagination
          table={table}
          summary={`Showing ${first.toLocaleString()}–${last.toLocaleString()} of ${meta.total.toLocaleString()} rows`}
        />
      )}

      <LocationDialog
        state={dialog}
        onOpenChange={(open) => !open && setDialog(null)}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && !remove.isPending && setToDelete(null)}
        title={
          toDelete
            ? `Delete ${LEVEL_LABEL[toDelete.level].en.toLowerCase()} "${toDelete.item.nameKh}"?`
            : ''
        }
        desc={
          toDelete?.level === 'communes'
            ? 'This cannot be undone. A commune used by outlet submissions cannot be deleted; deactivate it instead.'
            : `This cannot be undone. It can only be deleted when it has no ${toDelete?.level === 'provinces' ? 'districts' : 'communes'} left; otherwise deactivate it instead.`
        }
        confirmText='Delete'
        destructive
        isLoading={remove.isPending}
        handleConfirm={() => toDelete && remove.mutate(toDelete)}
      />
    </div>
  )
}
