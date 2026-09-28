import { AxiosError } from 'axios'
import { apiClient, type ApiResponse } from '@/lib/api-client'

export type SubmitClientInput = {
  clientName: string
  phone: string
  provinceId: string
  districtId: string
  communeId: string
  saleGbId: string
  files: File[]
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

export async function submitClient(
  input: SubmitClientInput,
  {
    idempotencyKey,
    onProgress,
  }: { idempotencyKey: string; onProgress?: (percent: number) => void }
) {
  const form = new FormData()
  form.append('clientName', input.clientName)
  form.append('phone', input.phone)
  form.append('provinceId', input.provinceId)
  form.append('districtId', input.districtId)
  form.append('communeId', input.communeId)
  form.append('saleGbId', input.saleGbId)
  for (const file of input.files) form.append('files', file, file.name)

  const res = await apiClient.post<ApiResponse<SubmitClientResult>>(
    '/public/submissions',
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
