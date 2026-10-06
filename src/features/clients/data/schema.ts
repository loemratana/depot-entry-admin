import { z } from 'zod'
import { FILTER_DATE_PATTERN, isFilterRangeValid } from '../lib/format'

const isoDate = z
  .string()
  // A day, or a day and time (yyyy-MM-ddTHH:mm)
  .regex(FILTER_DATE_PATTERN)
  .optional()
  .catch(undefined)

const optionalId = z.string().trim().min(1).max(64).optional().catch(undefined)

/** URL search params of the /clients route (source of truth for filters) */
export const clientsSearchSchema = z
  .object({
    page: z.number().int().min(1).optional().catch(undefined),
    limit: z.number().int().min(1).max(100).optional().catch(undefined),
    search: z.string().max(100).optional().catch(undefined),
    provinceId: optionalId,
    districtId: optionalId,
    communeId: optionalId,
    saleGbId: optionalId,
    dateFrom: isoDate,
    dateTo: isoDate,
  })
  // A hand-edited URL must not produce an impossible date range
  .transform((search) =>
    !isFilterRangeValid(search.dateFrom, search.dateTo)
      ? { ...search, dateTo: undefined }
      : search
  )

export type ClientsSearch = z.infer<typeof clientsSearchSchema>

/** Filters sent to both the list and the export endpoint */
export type ClientFilters = Pick<
  ClientsSearch,
  | 'search'
  | 'provinceId'
  | 'districtId'
  | 'communeId'
  | 'saleGbId'
  | 'dateFrom'
  | 'dateTo'
>

export const FILTER_KEYS = [
  'search',
  'provinceId',
  'districtId',
  'communeId',
  'dateFrom',
  'dateTo',
] as const satisfies readonly (keyof ClientFilters)[]

export function pickFilters(search: ClientsSearch): ClientFilters {
  const filters: ClientFilters = {}
  for (const key of FILTER_KEYS) {
    const value = search[key]?.trim()
    if (value) filters[key] = value
  }
  return filters
}

export type LocationOption = {
  id: string
  nameKh: string
  nameEn: string
  code?: string
}

export type SaleOption = {
  id: string
  name: string
  code: string | null
}

export type NamedLocation = {
  id: string | null
  nameKh: string
  nameEn: string
}

export type FileKind = 'image' | 'pdf' | 'other'

/** Device-reported GPS of a site photo (null for documents and older submissions) */
export type FileGps = {
  photoId: string | null
  latitude: number
  longitude: number
  accuracy: number | null
  capturedAt: string | null
}

export type SubmissionFile = {
  id: string
  name: string
  mimeType: string
  size: number | null
  url: string | null
  kind: FileKind
  /** When this file was received and stored (ISO string) */
  uploadedAt: string | null
  /** Added by an admin (true) or sent by the client from the public form */
  uploadedByAdmin: boolean
  gps: FileGps | null
}

export type Submission = {
  id: string
  submissionNo: string
  clientName: string
  phone: string
  province: NamedLocation | null
  district: NamedLocation | null
  commune: NamedLocation | null
  saleGb: { id: string | null; name: string } | null
  submittedAt: string | null
  files: SubmissionFile[]
  /** Has at least one GPS site photo, so it can be shown on the map */
  hasGps: boolean
}

/* ------------------------------------------------------------------ */
/* Normalization                                                        */
/* The backend stores references plus name snapshots. Depending on the  */
/* endpoint these arrive flat (provinceNameEn) or nested (province.*),   */
/* so rows are normalized once here instead of in every component.      */
/* ------------------------------------------------------------------ */

type RawRecord = Record<string, unknown>

const str = (value: unknown) =>
  typeof value === 'string'
    ? value
    : typeof value === 'number'
      ? `${value}`
      : ''

const asRecord = (value: unknown): RawRecord | null =>
  value && typeof value === 'object' ? (value as RawRecord) : null

const idOf = (value: unknown): string | null => {
  const record = asRecord(value)
  if (record) return str(record.id) || str(record._id) || null
  return str(value) || null
}

function toLocation(raw: RawRecord, key: string): NamedLocation | null {
  const nested = asRecord(raw[key])
  const populated = asRecord(raw[`${key}Id`])
  const source = nested ?? populated
  const nameKh = str(source?.nameKh) || str(raw[`${key}NameKh`])
  const nameEn = str(source?.nameEn) || str(raw[`${key}NameEn`])
  if (!nameKh && !nameEn) return null
  return {
    id: idOf(source) ?? idOf(raw[`${key}Id`]),
    nameKh,
    nameEn,
  }
}

function toSaleGb(raw: RawRecord): Submission['saleGb'] {
  const nested = asRecord(raw.saleGb) ?? asRecord(raw.saleGbId)
  const name =
    str(nested?.name) ||
    str(raw.saleGbName) ||
    (typeof raw.saleGb === 'string' ? raw.saleGb : '')
  if (!name) return null
  return { id: idOf(nested) ?? idOf(raw.saleGbId), name }
}

function fileKind(mimeType: string, name: string): FileKind {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf'
  if (/\.(jpe?g|png|webp|gif)$/i.test(name)) return 'image'
  return 'other'
}

function toGps(value: unknown): FileGps | null {
  const raw = asRecord(value)
  const latitude = Number(raw?.latitude)
  const longitude = Number(raw?.longitude)
  if (!raw || !Number.isFinite(latitude) || !Number.isFinite(longitude))
    return null
  const accuracy = Number(raw.accuracy)
  return {
    photoId: str(raw.photoId) || null,
    latitude,
    longitude,
    accuracy:
      raw.accuracy != null && Number.isFinite(accuracy) ? accuracy : null,
    capturedAt: str(raw.capturedAt) || null,
  }
}

function toFile(value: unknown, index: number): SubmissionFile | null {
  const raw = asRecord(value)
  if (!raw) return null
  const name =
    str(raw.originalName) || str(raw.name) || str(raw.fileName) || 'document'
  const mimeType = str(raw.mimeType) || str(raw.contentType)
  const size = Number(raw.size)
  const url =
    str(raw.url) || str(raw.presignedUrl) || str(raw.downloadUrl) || null
  return {
    id: idOf(raw) ?? (str(raw.objectKey) || `${index}-${name}`),
    name,
    mimeType,
    size: Number.isFinite(size) && size > 0 ? size : null,
    url,
    kind: fileKind(mimeType, name),
    uploadedAt: str(raw.uploadedAt) || null,
    uploadedByAdmin: raw.uploadedByAdmin === true,
    gps: toGps(raw.gps),
  }
}

export function normalizeSubmission(value: unknown): Submission {
  const raw = asRecord(value) ?? {}
  const files = Array.isArray(raw.files)
    ? raw.files
    : Array.isArray(raw.documents)
      ? raw.documents
      : []

  return {
    id: idOf(raw) ?? '',
    submissionNo: str(raw.submissionNo),
    clientName: str(raw.clientName) || str(raw.name),
    phone: str(raw.phone),
    province: toLocation(raw, 'province'),
    district: toLocation(raw, 'district'),
    commune: toLocation(raw, 'commune'),
    saleGb: toSaleGb(raw),
    submittedAt: str(raw.submittedAt) || str(raw.createdAt) || null,
    hasGps:
      raw.hasGps === true ||
      files.some((file) => asRecord(asRecord(file)?.gps) !== null),
    files: files
      .map(toFile)
      .filter((file): file is SubmissionFile => file !== null),
  }
}
