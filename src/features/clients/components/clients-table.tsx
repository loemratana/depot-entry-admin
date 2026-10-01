import { useEffect, useMemo } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { AlertCircle, Inbox, RotateCw, SearchX } from 'lucide-react'
import { getErrorMessage } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'
import { type NavigateFn, useTableUrlState } from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from '@/components/data-table'
import { useSubmissions } from '../data/queries'
import { type ClientFilters } from '../data/schema'
import { type ClientRowActions, getClientsColumns } from './clients-columns'

export const DEFAULT_PAGE_SIZE = 20
const SKELETON_ROWS = 8

type ClientsTableProps = {
  search: Record<string, unknown>
  navigate: NavigateFn
  filters: ClientFilters
  hasActiveFilters: boolean
  onClearFilters: () => void
} & ClientRowActions

export function ClientsTable({
  search,
  navigate,
  filters,
  hasActiveFilters,
  onClearFilters,
  onView,
  onViewMap,
  onViewStock,
  onEdit,
  onDelete,
}: ClientsTableProps) {
  // Pagination is synced with the URL (?page=&limit=), filtering happens server-side
  const { pagination, onPaginationChange, ensurePageInRange } =
    useTableUrlState({
      search,
      navigate,
      pagination: {
        pageSizeKey: 'limit',
        defaultPage: 1,
        defaultPageSize: DEFAULT_PAGE_SIZE,
      },
      globalFilter: { enabled: false },
    })

  const query = useSubmissions({
    ...filters,
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
  })

  const rows = query.data?.data
  const meta = query.data?.pagination
  const total = meta?.total ?? 0
  const pageCount = Math.max(meta?.totalPages ?? 1, 1)

  const columns = useMemo(
    () =>
      getClientsColumns({ onView, onViewMap, onViewStock, onEdit, onDelete }),
    [onView, onViewMap, onViewStock, onEdit, onDelete]
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows ?? [],
    columns,
    getRowId: (row, index) => row.id || `${index}`,
    state: { pagination },
    onPaginationChange,
    manualPagination: true,
    // Server returns newest first; client-side sorting would only reorder one page
    enableSorting: false,
    pageCount,
    rowCount: total,
    getCoreRowModel: getCoreRowModel(),
  })

  // e.g. a stale ?page=9 after the data shrank
  useEffect(() => {
    if (meta) ensurePageInRange(meta.totalPages)
  }, [meta, ensurePageInRange])

  const visibleColumnCount = table.getVisibleLeafColumns().length
  const firstRow =
    total === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1
  const lastRow = Math.min(firstRow + (rows?.length ?? 0) - 1, total)

  const renderBody = () => {
    if (query.isPending) {
      return Array.from({ length: SKELETON_ROWS }, (_, rowIndex) => (
        <TableRow key={`skeleton-${rowIndex}`} className='hover:bg-transparent'>
          {table.getVisibleLeafColumns().map((column) => (
            <TableCell
              key={column.id}
              className={column.columnDef.meta?.className}
            >
              <Skeleton className='h-4 w-full max-w-32' />
            </TableCell>
          ))}
        </TableRow>
      ))
    }

    if (query.isError && !rows) {
      return (
        <StateRow colSpan={visibleColumnCount}>
          <AlertCircle className='size-6 text-destructive' />
          <p className='font-medium'>Unable to load outlet submissions.</p>
          <p className='text-sm text-muted-foreground'>
            {getErrorMessage(query.error, 'Please try again in a moment.')}
          </p>
          <Button
            variant='outline'
            size='sm'
            className='mt-2'
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RotateCw className={cn(query.isFetching && 'animate-spin')} />
            Retry
          </Button>
        </StateRow>
      )
    }

    if (!rows?.length) {
      return hasActiveFilters ? (
        <StateRow colSpan={visibleColumnCount}>
          <SearchX className='size-6 text-muted-foreground' />
          <p className='font-medium'>No outlets match the selected filters.</p>
          <Button
            variant='outline'
            size='sm'
            className='mt-2'
            onClick={onClearFilters}
          >
            Clear filters
          </Button>
        </StateRow>
      ) : (
        <StateRow colSpan={visibleColumnCount}>
          <Inbox className='size-6 text-muted-foreground' />
          <p className='font-medium'>No outlet submissions yet.</p>
        </StateRow>
      )
    }

    return table.getRowModel().rows.map((row) => (
      <TableRow
        key={row.id}
        className='cursor-pointer'
        onClick={() => onView(row.original)}
      >
        {row.getVisibleCells().map((cell) => (
          <TableCell
            key={cell.id}
            className={cn(
              'py-2.5',
              cell.column.columnDef.meta?.className,
              cell.column.columnDef.meta?.tdClassName
            )}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    ))
  }

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <div
        className={cn(
          'overflow-hidden rounded-md border transition-opacity',
          // Previous page stays visible while the next one loads
          query.isPlaceholderData && 'opacity-60'
        )}
        aria-busy={query.isFetching}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className='hover:bg-transparent'>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(
                      'bg-muted/50',
                      header.column.columnDef.meta?.className,
                      header.column.columnDef.meta?.thClassName
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>{renderBody()}</TableBody>
        </Table>
      </div>
      {total > 0 && (
        <DataTablePagination
          table={table}
          className='mt-auto'
          summary={
            <>
              Showing {firstRow}–{lastRow} of {total.toLocaleString()}
            </>
          }
        />
      )}
    </div>
  )
}

function StateRow({
  colSpan,
  children,
}: {
  colSpan: number
  children: React.ReactNode
}) {
  return (
    <TableRow className='hover:bg-transparent'>
      <TableCell colSpan={colSpan} className='h-56'>
        <div className='flex flex-col items-center justify-center gap-1 text-center'>
          {children}
        </div>
      </TableCell>
    </TableRow>
  )
}
