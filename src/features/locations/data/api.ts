import { AxiosError } from 'axios'
import {
  apiClient,
  type ApiResponse,
  type PaginatedResponse,
} from '@/lib/api-client'

type Count = { total: number; active: number }

export type LocationSummary = {
  provinces: Count
  districts: Count
  communes: Count
}

export type LevelResult = {
  created: number
  updated: number
  unchanged: number
  matchedByName: number
}

type RowIssue = { sheet: string; row: number; reason: string }

export type DuplicateName = {
  sheet: string
  row: number
  level: 'province' | 'district' | 'commune'
  name: string
  duplicateOf: string
  firstRow: number
}

type Limited<T> = { total: number; items: T[] }

export type ImportReport = {
  dryRun: boolean
  fileName: string
  sheets: { name: string; headerRow: number }[]
  skippedSheets: string[]
  rows: { read: number; blank: number; inheritedParent: number }
  inFile: { provinces: number; districts: number; communes: number }
  result: {
    provinces: LevelResult
    districts: LevelResult
    communes: LevelResult
  }
  duplicates: Limited<DuplicateName>
  invalid: Limited<RowIssue>
  warnings: Limited<RowIssue>
}

export async function getLocationSummary() {
  const res = await apiClient.get<ApiResponse<LocationSummary>>(
    '/admin/locations/summary'
  )
  return res.data.data
}

/** dryRun=true checks the file against the database without saving */
export async function uploadLocations(file: File, dryRun: boolean) {
  const form = new FormData()
  form.append('file', file, file.name)
  const res = await apiClient.post<ApiResponse<ImportReport>>(
    '/admin/locations/import',
    form,
    { params: { dryRun }, timeout: 5 * 60 * 1000 }
  )
  return res.data.data
}

export async function downloadLocationTemplate() {
  try {
    const res = await apiClient.get<Blob>('/admin/locations/template', {
      responseType: 'blob',
    })
    return res.data
  } catch (error) {
    // Error bodies arrive as a Blob because of responseType; decode the JSON message
    if (error instanceof AxiosError && error.response?.data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await error.response.data.text())
      } catch {
        error.response.data = {}
      }
    }
    throw error
  }
}

export type LocationLevel = 'provinces' | 'districts' | 'communes'

export type LocationRef = {
  id: string
  nameKh: string
  nameEn: string
  isActive: boolean
}

/** One table row; provinces without districts (and districts without communes) have nulls */
export type LocationRow = {
  id: string
  province: LocationRef
  district: LocationRef | null
  commune: LocationRef | null
}

export type LocationListParams = {
  search?: string
  provinceId?: string
  page: number
  limit: number
}

export async function getLocationRows(
  params: LocationListParams,
  signal?: AbortSignal
) {
  const res = await apiClient.get<PaginatedResponse<LocationRow>>(
    '/admin/locations',
    { params, signal }
  )
  return res.data
}

export type LocationInput = {
  /** Province id for a district, district id for a commune */
  parentId?: string
  nameKh: string
  nameEn?: string
}

export async function createLocation(
  level: LocationLevel,
  input: LocationInput
) {
  const res = await apiClient.post<ApiResponse<LocationRef>>(
    `/admin/locations/${level}`,
    input
  )
  return res.data.data
}

export async function updateLocation(
  level: LocationLevel,
  id: string,
  changes: Partial<Pick<LocationRef, 'nameKh' | 'nameEn' | 'isActive'>>
) {
  const res = await apiClient.patch<ApiResponse<LocationRef>>(
    `/admin/locations/${level}/${id}`,
    changes
  )
  return res.data.data
}

export async function deleteLocation(level: LocationLevel, id: string) {
  await apiClient.delete(`/admin/locations/${level}/${id}`)
}
