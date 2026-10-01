import { StockDetailSheet } from '@/features/stock/components/stock-detail-sheet'
import { useStockReports } from '@/features/stock/data/api'
import { type Submission } from '../data/schema'

type OutletStockSheetProps = {
  outlet: Submission | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** The outlet's latest stock report, opened from the Outlet table */
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

  return (
    <StockDetailSheet
      report={report}
      open={open}
      onOpenChange={onOpenChange}
      isLoading={reports.isPending || reports.isPlaceholderData}
      emptyText={
        reports.isError
          ? 'មិនអាចផ្ទុកស្តុកបានទេ · Unable to load the stock.'
          : 'មិនទាន់មានស្តុក · No stock recorded for this outlet yet.'
      }
    />
  )
}
