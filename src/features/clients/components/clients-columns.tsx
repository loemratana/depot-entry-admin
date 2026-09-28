import { type ColumnDef } from '@tanstack/react-table'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/data-table'
import { type Submission } from '../data/schema'
import { formatPhone, formatSubmittedAt, locationName } from '../lib/format'

const empty = <span className='text-muted-foreground'>—</span>

function renderLocation(value: Submission['province']) {
  const name = locationName(value)
  return name ? <span className='text-nowrap'>{name}</span> : empty
}

export function getClientsColumns(
  onView: (submission: Submission) => void
): ColumnDef<Submission>[] {
  return [
    {
      accessorKey: 'clientName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Client Name' />
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
      id: 'saleGb',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Sale GB' />
      ),
      cell: ({ row }) =>
        row.original.saleGb ? (
          <span className='text-nowrap'>{row.original.saleGb.name}</span>
        ) : (
          empty
        ),
      meta: { className: 'hidden @3xl/content:table-cell' },
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
      cell: ({ row }) => (
        <Button
          variant='ghost'
          size='icon'
          className='size-8'
          onClick={(event) => {
            // The row itself also opens details; avoid a double trigger
            event.stopPropagation()
            onView(row.original)
          }}
        >
          <Eye className='size-4' />
          <span className='sr-only'>
            View details of {row.original.clientName}
          </span>
        </Button>
      ),
      meta: { className: 'w-12 text-end' },
    },
  ]
}
