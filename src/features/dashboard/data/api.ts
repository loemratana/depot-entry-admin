import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiClient, type ApiResponse } from '@/lib/api-client'
import { type MeasureKey } from '@/features/stock/data/api'

export type DashboardFilters = {
  provinceId?: string
  districtId?: string
  communeId?: string
  /** YYYY-MM-DD, Cambodia time; both inclusive */
  dateFrom?: string
  dateTo?: string
}

export type ProductTotal = {
  productId: string
  name: string
  /** Card label, e.g. "GB Gold" (the name when no short name is set) */
  shortName: string
  brandName: string
  /** Relative to /api; null when the brand has no logo */
  logoUrl: string | null
  /** The quantities this product's brand counts */
  measures: MeasureKey[]
  totals: Partial<Record<MeasureKey, number>>
  /** Outlets that reported some stock of this product */
  outlets: number
}

export type Dashboard = {
  todayOutlets: number
  totalOutlets: number
  /** Cases of all products added together; null when the user may not see stock */
  totalStock: { cases: number; outlets: number } | null
  /** null when the user may not see stock */
  products: ProductTotal[] | null
}

export function useDashboard(filters: DashboardFilters) {
  return useQuery({
    queryKey: ['dashboard', filters],
    queryFn: async ({ signal }) =>
      (
        await apiClient.get<ApiResponse<Dashboard>>('/admin/dashboard', {
          params: filters,
          signal,
        })
      ).data.data,
    // Keep the old numbers on screen while a new filter loads
    placeholderData: keepPreviousData,
    // New outlets come in during the day
    refetchInterval: 60_000,
  })
}

export type ProvinceStock = {
  /** What the rows are: provinces, or the districts / communes of the chosen place */
  level?: 'province' | 'district' | 'commune'
  /** Products in stock-form order; provinces' `cases` follow this order */
  products: { id: string; shortName: string }[]
  /** One row per place, largest total first (named provinces for the chart) */
  provinces: {
    id: string
    nameKh: string
    nameEn: string
    cases: number[]
    total: number
    /** Outlets added in the period in this province */
    outlets: number
  }[]
}

export type ProvinceStockFilters = {
  provinceId?: string
  districtId?: string
  communeId?: string
  dateFrom?: string
  dateTo?: string
}

export function useProvinceStock(period: ProvinceStockFilters) {
  return useQuery({
    queryKey: ['dashboard', 'provinces', period],
    queryFn: async ({ signal }) =>
      (
        await apiClient.get<ApiResponse<ProvinceStock>>(
          '/admin/dashboard/provinces',
          { params: period, signal }
        )
      ).data.data,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })
}
