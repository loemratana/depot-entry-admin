import { AxiosError } from 'axios'
import { apiClient, type ApiResponse } from '@/lib/api-client'
import { type MeasureKey } from '@/features/stock/data/api'
import { type GpsReading } from '../lib/geolocation'
import { locationField } from '../lib/typed-location'

export type SubmitClientInput = {
  clientName: string
  phone: string
  provinceId: string
  /** A picked id, or `new:<name>` when typed (see lib/typed-location) */
  districtId: string
  communeId: string
  /** Optional; the public form no longer asks for it */
  saleGbName?: string
  files: File[]
  /** Site photos, each with its own id and GPS reading. A photo already
   * uploaded in the background is sent by its uploadId instead of its file. */
  sitePhotos?: {
    photoId: string
    file: File
    gps: GpsReading
    uploadId?: string
  }[]
  /** The outlet's stock, one entry per product; blank boxes already converted to 0.
   * Only the quantities the product's brand counts are sent. */
  stockItems?: ({ productId: string } & Partial<Record<MeasureKey, number>>)[]
}

export type SubmitClientResult = { submissionNo: string }

/** Field-level errors returned by the backend as `{ errors: [{ field, message }] }` */
export type FieldError = { field?: string; message: string }

export function getFieldErrors(error: unknown): FieldError[] {
  if (!(error instanceof AxiosError)) return []
  const errors = (error.response?.data as { errors?: unknown } | undefined)
    ?.errors
  return Array.isArray(errors)
    ? errors.filter(
        (e): e is FieldError =>
          !!e && typeof e === 'object' && typeof e.message === 'string'
      )
    : []
}

export const DEFAULT_SUBMIT_ENDPOINT = '/public/submissions'

/** Uploads one site photo before Submit; returns its uploadId */
export async function stageSitePhoto(
  file: File,
  endpoint: string = DEFAULT_SUBMIT_ENDPOINT
) {
  const form = new FormData()
  form.append('photo', file, file.name)
  const res = await apiClient.post<ApiResponse<{ uploadId: string }>>(
    `${endpoint}/photos`,
    form,
    { timeout: 2 * 60 * 1000 }
  )
  return res.data.data.uploadId
}

export async function submitClient(
  input: SubmitClientInput,
  {
    idempotencyKey,
    onProgress,
    endpoint = DEFAULT_SUBMIT_ENDPOINT,
  }: {
    idempotencyKey: string
    onProgress?: (percent: number) => void
    /** The public form; the admin "Add outlet" sends the same form to /admin/submissions */
    endpoint?: string
  }
) {
  const form = new FormData()
  form.append('clientName', input.clientName)
  form.append('phone', input.phone)
  form.append('provinceId', input.provinceId)
  // Picked from the list (id) or typed because it was missing (name)
  for (const [level, value] of [
    ['district', input.districtId],
    ['commune', input.communeId],
  ] as const) {
    const location = locationField(level, value)
    form.append(location.field, location.value)
  }
  if (input.saleGbName) form.append('saleGbName', input.saleGbName)
  if (input.stockItems?.length)
    form.append('stockItems', JSON.stringify(input.stockItems))
  for (const file of input.files) form.append('files', file, file.name)
  // The part name carries the photoId, so GPS never depends on the order of the parts
  if (input.sitePhotos?.length) {
    form.append(
      'sitePhotoMeta',
      JSON.stringify(
        input.sitePhotos.map(({ photoId, gps }) => ({ photoId, ...gps }))
      )
    )
    const staged = input.sitePhotos.filter((photo) => photo.uploadId)
    if (staged.length)
      form.append(
        'stagedPhotos',
        JSON.stringify(
          staged.map(({ photoId, uploadId }) => ({ photoId, uploadId }))
        )
      )
    for (const { photoId, file, uploadId } of input.sitePhotos)
      if (!uploadId) form.append(`sitePhotos[${photoId}]`, file, file.name)
  }

  const res = await apiClient.post<ApiResponse<SubmitClientResult>>(
    endpoint,
    form,
    {
      headers: { 'Idempotency-Key': idempotencyKey },
      // Several photos over a mobile connection can take a while
      timeout: 5 * 60 * 1000,
      onUploadProgress: (event) => {
        if (event.total)
          onProgress?.(Math.round((event.loaded / event.total) * 100))
      },
    }
  )
  return res.data.data
}
