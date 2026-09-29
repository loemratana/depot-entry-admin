import { createFileRoute } from '@tanstack/react-router'
import { StockReports } from '@/features/stock'

export const Route = createFileRoute('/_authenticated/stock-reports/')({
  component: StockReports,
})
