import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiClient, type ApiResponse } from '@/lib/api-client'

/** One geotagged site photo, as returned by GET /admin/map/submissions */
export type MapPoint = {
  /** File id of the photo */
  id: string
  photoId: string | null
  submissionId: string
  clientName: string
  phone: string
  provinceNameKh: string
  provinceNameEn: string
  districtNameKh: string
  districtNameEn: string
  communeNameKh: string
  communeNameEn: string
  latitude: number
  longitude: number
  accuracy: number | null
  capturedAt: string | null
  submittedAt: string
  /** Short-lived presigned URL; loaded only when the marker's popup opens */
  photoUrl: string
  photoUrlExpiresAt: string
}

export type MapFilters = {
  provinceId?: string
  districtId?: string
  communeId?: string
  dateFrom?: string
  dateTo?: string
  /** Only this outlet's photos ("View on map") */
  submissionId?: string
}

// Photo URLs expire after 15 minutes; refresh well before that while the page is open
const REFRESH_MS = 10 * 60 * 1000

export function useMapPoints(filters: MapFilters) {
  return useQuery({
    queryKey: ['client-map', filters],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<ApiResponse<MapPoint[]>>(
        '/admin/map/submissions',
        { params: filters, signal }
      )
      return { points: res.data.data ?? [], notice: res.data.message }
    },
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH_MS,
  })
}
