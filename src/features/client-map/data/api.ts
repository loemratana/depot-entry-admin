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
  /** The full photo; loaded only when the marker's popup opens */
  photoUrl: string
  photoUrlExpiresAt: string
  /** 160 px preview for the marker card; null until the server has made it */
  thumbnailUrl: string | null
  /** The thumbnail is still being made (asked for again shortly) */
  thumbnailPending?: boolean
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

// Links stay the same for 6 hours (so the browser caches the images) and are
// valid for at least 6 more; refreshing also picks up new outlets
const REFRESH_MS = 10 * 60 * 1000
// While some thumbnails are still being made, ask again soon
const PENDING_THUMBNAILS_REFRESH_MS = 5000

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
    refetchInterval: (query) =>
      query.state.data?.points.some((p) => p.thumbnailPending)
        ? PENDING_THUMBNAILS_REFRESH_MS
        : REFRESH_MS,
  })
}
