import { AxiosError } from 'axios'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  apiClient,
  type ApiResponse,
  type PaginatedResponse,
} from '@/lib/api-client'
import { getErrorMessage } from '@/lib/handle-server-error'

// ---------- Types ----------

/** Every quantity the backend knows, in form order; each brand counts some or all */
export const MEASURE_KEYS = [
  'cases',
  'canRings',
  'cashRingsUsd',
  'cashRingsKhr',
] as const
export type MeasureKey = (typeof MEASURE_KEYS)[number]
export type Measure = { key: MeasureKey; kh: string; en: string }

export type StockCatalog = {
  measures: Measure[]
  brands: {
    id: string
    name: string
    nameKh: string
    /** The quantities asked for this brand's products */
    measures: MeasureKey[]
    /** Relative to /api; turn into a full URL with apiUrl(). null = no logo */
    logoUrl: string | null
    products: { id: string; name: string }[]
  }[]
}

type Named = { id: string; nameKh: string; nameEn: string }

export type StockReport = {
  id: string
  outlet: { id: string; name: string }
  province: Named
  district: Named
  commune: Named
  items: ({
    productId: string
    brandName: string
    productName: string
    /** The quantities this product's brand counted */
    measures: MeasureKey[]
  } & Record<MeasureKey, number>)[]
  totals: Record<MeasureKey, number>
  reportedAt: string
  submittedByAdmin: boolean
}

export type StockFilters = {
  search?: string
  provinceId?: string
  districtId?: string
  communeId?: string
  dateFrom?: string
  dateTo?: string
}

// ---------- Public ----------

export async function getStockCatalog() {
  const res = await apiClient.get<ApiResponse<StockCatalog>>(
    '/public/stock/catalog'
  )
  return res.data.data
}

export function useStockCatalog() {
  return useQuery({
    queryKey: ['stock', 'catalog'],
    queryFn: getStockCatalog,
    staleTime: 10 * 60 * 1000,
  })
}

// ---------- Admin ----------

const stockKeys = {
  all: ['stock', 'reports'] as const,
  list: (params: object) => [...stockKeys.all, 'list', params] as const,
  detail: (id: string) => [...stockKeys.all, 'detail', id] as const,
}

export function useStockReports(
  params: StockFilters & { page: number; limit: number }
) {
  return useQuery({
    queryKey: stockKeys.list(params),
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<PaginatedResponse<StockReport>>(
        '/admin/stock/reports',
        { params, signal }
      )
      return res.data
    },
    placeholderData: keepPreviousData,
  })
}

export function useStockReport(id: string | null) {
  return useQuery({
    queryKey: stockKeys.detail(id ?? ''),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<StockReport>>(
        `/admin/stock/reports/${encodeURIComponent(id!)}`
      )
      return res.data.data
    },
    enabled: !!id,
  })
}

export function useDeleteStockReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/admin/stock/reports/${encodeURIComponent(id)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: stockKeys.all }),
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Unable to delete the stock report.')),
  })
}

function filenameFromDisposition(header: unknown) {
  if (typeof header !== 'string') return null
  return /filename="?([^";]+)"?/i.exec(header)?.[1]?.trim() ?? null
}

export function useExportStock() {
  return useMutation({
    mutationFn: async (filters: StockFilters) => {
      try {
        const res = await apiClient.get<Blob>('/admin/stock/reports/export', {
          params: filters,
          responseType: 'blob',
          timeout: 5 * 60 * 1000,
        })
        return {
          blob: res.data,
          filename:
            filenameFromDisposition(res.headers['content-disposition']) ??
            'stock-reports.xlsx',
        }
      } catch (error) {
        // Error bodies arrive as a Blob because of responseType; decode the JSON message
        if (
          error instanceof AxiosError &&
          error.response?.data instanceof Blob
        ) {
          try {
            error.response.data = JSON.parse(await error.response.data.text())
          } catch {
            error.response.data = {}
          }
        }
        throw error
      }
    },
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success('Export ready', { description: filename })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Unable to export stock reports.')),
  })
}
