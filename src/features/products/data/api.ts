import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient, type ApiResponse } from '@/lib/api-client'
import { getErrorMessage } from '@/lib/handle-server-error'
import { type Measure, type MeasureKey } from '@/features/stock/data/api'

export type AdminProduct = {
  id: string
  name: string
  /** Label on the dashboard card, e.g. "GB Gold"; empty = the name */
  shortName: string
  isActive: boolean
  sortOrder: number
}

export type AdminBrand = {
  id: string
  name: string
  nameKh: string
  measures: MeasureKey[]
  isActive: boolean
  sortOrder: number
  /** Relative to /api; use apiUrl(). null = no logo */
  logoUrl: string | null
  products: AdminProduct[]
}

export type BrandInput = {
  name: string
  nameKh: string
  measures: MeasureKey[]
  isActive: boolean
}

export type ProductInput = {
  name: string
  shortName: string
  isActive: boolean
}

const base = '/admin/stock'
const brandsKey = ['stock', 'brands'] as const

export function useBrands() {
  return useQuery({
    queryKey: brandsKey,
    queryFn: async () => {
      const res = await apiClient.get<
        ApiResponse<{ measures: Measure[]; brands: AdminBrand[] }>
      >(`${base}/brands`)
      return res.data.data
    },
  })
}

/** Refreshes this page and the stock form's catalog (brand steps, logos) */
function useRefresh() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: brandsKey })
    queryClient.invalidateQueries({ queryKey: ['stock', 'catalog'] })
  }
}

function useAction<T>(
  run: (input: T) => Promise<unknown>,
  { success, failure }: { success?: string; failure: string }
) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: run,
    onSuccess: () => {
      refresh()
      if (success) toast.success(success)
    },
    onError: (error) => toast.error(getErrorMessage(error, failure)),
  })
}

export const useCreateBrand = () =>
  useMutation({
    mutationFn: async (input: BrandInput) =>
      (await apiClient.post<ApiResponse<AdminBrand>>(`${base}/brands`, input))
        .data.data,
  })

export const useUpdateBrand = () =>
  useMutation({
    mutationFn: async ({
      id,
      changes,
    }: {
      id: string
      changes: Partial<BrandInput>
    }) =>
      (
        await apiClient.patch<ApiResponse<AdminBrand>>(
          `${base}/brands/${id}`,
          changes
        )
      ).data.data,
  })

export const useUploadLogo = () =>
  useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const form = new FormData()
      form.append('logo', file, file.name)
      return (
        await apiClient.put<ApiResponse<AdminBrand>>(
          `${base}/brands/${id}/logo`,
          form
        )
      ).data.data
    },
  })

export const useRemoveLogo = () =>
  useMutation({
    mutationFn: async (id: string) =>
      (
        await apiClient.delete<ApiResponse<AdminBrand>>(
          `${base}/brands/${id}/logo`
        )
      ).data.data,
  })

export const useRefreshBrands = useRefresh

export const useToggleBrand = () =>
  useAction(
    ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`${base}/brands/${id}`, { isActive }),
    { failure: 'Unable to update the brand.' }
  )

export const useDeleteBrand = () =>
  useAction((id: string) => apiClient.delete(`${base}/brands/${id}`), {
    success: 'Brand deleted',
    failure: 'Unable to delete the brand.',
  })

export const useMoveBrand = () =>
  useAction(
    ({ id, direction }: { id: string; direction: 'up' | 'down' }) =>
      apiClient.post(`${base}/brands/${id}/move`, { direction }),
    { failure: 'Unable to move the brand.' }
  )

export const useCreateProduct = () =>
  useMutation({
    mutationFn: ({
      brandId,
      input,
    }: {
      brandId: string
      input: ProductInput
    }) => apiClient.post(`${base}/brands/${brandId}/products`, input),
  })

export const useUpdateProduct = () =>
  useMutation({
    mutationFn: ({
      id,
      changes,
    }: {
      id: string
      changes: Partial<ProductInput>
    }) => apiClient.patch(`${base}/products/${id}`, changes),
  })

export const useToggleProduct = () =>
  useAction(
    ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`${base}/products/${id}`, { isActive }),
    { failure: 'Unable to update the product.' }
  )

export const useDeleteProduct = () =>
  useAction((id: string) => apiClient.delete(`${base}/products/${id}`), {
    success: 'Product deleted',
    failure: 'Unable to delete the product.',
  })

export const useMoveProduct = () =>
  useAction(
    ({ id, direction }: { id: string; direction: 'up' | 'down' }) =>
      apiClient.post(`${base}/products/${id}/move`, { direction }),
    { failure: 'Unable to move the product.' }
  )
