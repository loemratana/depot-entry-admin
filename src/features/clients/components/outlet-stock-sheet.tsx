import { useState } from 'react'
import { useCan } from '@/lib/permissions'
import { OutletStockDialog } from '@/features/stock/components/outlet-stock-dialog'
import { StockDetailSheet } from '@/features/stock/components/stock-detail-sheet'
import { useStockReports } from '@/features/stock/data/api'
import { type Submission } from '../data/schema'

type OutletStockSheetProps = {
  outlet: Submission | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The outlet's latest stock report, opened from the Outlet table. With
 * stock.update the stock can be edited, or added again after it was deleted.
 */
export function OutletStockSheet({
  outlet,
  open,
  onOpenChange,
}: OutletStockSheetProps) {
  const reports = useStockReports(
    { outletId: outlet?.id, page: 1, limit: 1 },
    { enabled: open && !!outlet }
  )
  // Reports are listed newest first
  const report =
    reports.data?.data[0]?.outlet.id === outlet?.id
      ? (reports.data?.data[0] ?? null)
      : null

  const can = useCan()
  const [editing, setEditing] = useState(false)

  return (
    <>
      <StockDetailSheet
        report={report}
        open={open}
        onOpenChange={onOpenChange}
        onEdit={
          can('stock.update') && outlet && !reports.isError
            ? () => setEditing(true)
            : undefined
        }
        isLoading={reports.isPending || reports.isPlaceholderData}
        emptyText={
          reports.isError
            ? 'មិនអាចផ្ទុកស្តុកបានទេ · Unable to load the stock.'
            : 'មិនទាន់មានស្តុក · No stock recorded for this outlet yet.'
        }
      />
      {editing && outlet && (
        <OutletStockDialog
          open
          onOpenChange={setEditing}
          outlet={{ id: outlet.id, name: outlet.clientName }}
          report={report}
        />
      )}
    </>
  )
}
