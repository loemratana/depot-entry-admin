import { type ColumnDef } from '@tanstack/react-table'
import { Eye, MapIcon, Package, Pencil, Trash2 } from 'lucide-react'
import { DataTableColumnHeader } from '@/components/data-table'
import { type Submission } from '../data/schema'
import { formatPhone, formatSubmittedAt, locationName } from '../lib/format'
import { ActionButton } from './action-button'

const empty = <span className='text-muted-foreground'>—</span>

function renderLocation(value: Submission['province']) {
  const name = locationName(value)
  return name ? <span className='text-nowrap'>{name}</span> : empty
}

/** Row actions; one left out (no permission) hides its button */
export type ClientRowActions = {
  onView: (submission: Submission) => void
  onViewMap?: (submission: Submission) => void
  onViewStock?: (submission: Submission) => void
  onEdit?: (submission: Submission) => void
  onDelete?: (submission: Submission) => void
}

export function getClientsColumns({
  onView,
  onViewMap,
  onViewStock,
  onEdit,
  onDelete,
}: ClientRowActions): ColumnDef<Submission>[] {
  return [
    {
      accessorKey: 'clientName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Outlet Name' />
      ),
      // Wrap instead of truncating so Khmer stacked vowels are never clipped
      cell: ({ row }) => (
        <div className='max-w-56 min-w-28 leading-relaxed font-medium wrap-break-word'>
          {row.original.clientName || empty}
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Phone' />
      ),
      cell: ({ row }) => (
        <span className='text-nowrap tabular-nums'>
          {row.original.phone ? formatPhone(row.original.phone) : empty}
        </span>
      ),
    },
    {
      id: 'province',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Province' />
      ),
      cell: ({ row }) => renderLocation(row.original.province),
      meta: { className: 'hidden @2xl/content:table-cell' },
    },
    {
      id: 'district',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='District' />
      ),
      cell: ({ row }) => renderLocation(row.original.district),
      meta: { className: 'hidden @4xl/content:table-cell' },
    },
    {
      id: 'commune',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Commune' />
      ),
      cell: ({ row }) => renderLocation(row.original.commune),
      meta: { className: 'hidden @6xl/content:table-cell' },
    },
    {
      accessorKey: 'submittedAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Submitted At' />
      ),
      cell: ({ row }) => {
        const submitted = formatSubmittedAt(row.original.submittedAt)
        if (!submitted) return empty
        return (
          <div className='text-nowrap'>
            <div>{submitted.date}</div>
            <div className='text-xs text-muted-foreground'>
              {submitted.time}
            </div>
          </div>
        )
      },
      meta: { className: 'hidden @lg/content:table-cell' },
    },
    {
      id: 'actions',
      header: () => <span className='sr-only'>Actions</span>,
      cell: ({ row }) => {
        const outlet = row.original
        return (
          // The row itself also opens details; stop clicks here from doing that too
          <div
            className='flex justify-end gap-1.5'
            onClick={(event) => event.stopPropagation()}
          >
            <ActionButton
              label={`View details of ${outlet.clientName}`}
              tooltip='View details'
              className='bg-[#5027F5] hover:bg-[#4119d9]'
              onClick={() => onView(outlet)}
            >
              <Eye />
            </ActionButton>
            {onViewStock && (
              <ActionButton
                label={`View stock of ${outlet.clientName}`}
                tooltip='View stock'
                className='bg-emerald-600 hover:bg-emerald-700'
                onClick={() => onViewStock(outlet)}
              >
                <Package />
              </ActionButton>
            )}
            {onViewMap && (
              <ActionButton
                label={
                  outlet.hasGps
                    ? `View ${outlet.clientName} on the map`
                    : `${outlet.clientName} has no GPS photo to show on the map`
                }
                tooltip={
                  outlet.hasGps
                    ? 'View on map'
                    : 'No GPS photo to show on the map'
                }
                className='bg-sky-600 hover:bg-sky-700'
                disabled={!outlet.hasGps}
                onClick={() => onViewMap(outlet)}
              >
                <MapIcon />
              </ActionButton>
            )}
            {onEdit && (
              <ActionButton
                label={`Edit ${outlet.clientName}`}
                tooltip='Edit'
                className='bg-amber-500 hover:bg-amber-600'
                onClick={() => onEdit(outlet)}
              >
                <Pencil />
              </ActionButton>
            )}
            {onDelete && (
              <ActionButton
                label={`Delete ${outlet.clientName}`}
                tooltip='Delete'
                className='bg-red-600 hover:bg-red-700'
                onClick={() => onDelete(outlet)}
              >
                <Trash2 />
              </ActionButton>
            )}
          </div>
        )
      },
      meta: { className: 'w-48 text-end' },
    },
  ]
}
