import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
  useQuery,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/handle-server-error'
import {
  type ClientChanges,
  type ClientInput,
  type SubmissionListParams,
  addClientFiles,
  createClient,
  deleteClient,
  removeClientFile,
  updateClient,
  exportSubmissions,
  getCommunes,
  getDistricts,
  getProvinces,
  getSales,
  getSubmission,
  getSubmissions,
} from './api'
import { type ClientFilters } from './schema'

// Location and Sale GB lists rarely change
const REFERENCE_STALE_TIME = 10 * 60 * 1000

export const clientKeys = {
  all: ['clients'] as const,
  list: (params: SubmissionListParams) =>
    [...clientKeys.all, 'list', params] as const,
  detail: (id: string) => [...clientKeys.all, 'detail', id] as const,
}

export function useSubmissions(params: SubmissionListParams) {
  return useQuery({
    queryKey: clientKeys.list(params),
    queryFn: ({ signal }) => getSubmissions(params, signal),
    // Keep the current page visible while the next one loads
    placeholderData: keepPreviousData,
  })
}

export function useSubmission(id: string | null) {
  return useQuery({
    queryKey: clientKeys.detail(id ?? ''),
    queryFn: ({ signal }) => getSubmission(id!, signal),
    enabled: !!id,
    // Document links are short-lived presigned URLs; refresh on each open
    staleTime: 0,
  })
}

export const provincesQueryOptions = queryOptions({
  queryKey: ['locations', 'provinces'],
  queryFn: getProvinces,
  staleTime: REFERENCE_STALE_TIME,
})

export function useProvinces() {
  return useQuery(provincesQueryOptions)
}

export function useDistricts(provinceId: string | undefined) {
  return useQuery({
    queryKey: ['locations', 'districts', provinceId],
    queryFn: () => getDistricts(provinceId!),
    enabled: !!provinceId,
    staleTime: REFERENCE_STALE_TIME,
  })
}

export function useCommunes(
  districtId: string | undefined,
  provinceId?: string | undefined
) {
  return useQuery({
    queryKey: ['locations', 'communes', districtId, provinceId],
    queryFn: () => getCommunes(districtId!, provinceId),
    enabled: !!districtId,
    staleTime: REFERENCE_STALE_TIME,
  })
}

export function useSales() {
  return useQuery({
    queryKey: ['sales', 'active'],
    queryFn: getSales,
    staleTime: REFERENCE_STALE_TIME,
  })
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Give the browser a moment to start the download before revoking
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function useExportSubmissions() {
  return useMutation({
    mutationFn: (filters: ClientFilters) => exportSubmissions(filters),
    onSuccess: ({ blob, filename }) => {
      downloadBlob(blob, filename)
      toast.success('Export ready', { description: filename })
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, 'Unable to export outlet submissions.')
      )
    },
  })
}

// ---------- Admin CRUD ----------

/**
 * Refreshes lists and details; typed Sale GB names may have added a new Sale GB.
 * An outlet's stock reports, dashboard numbers and map points change with it
 * (renamed, moved or deleted), so those refresh too.
 */
function useRefreshClients() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: clientKeys.all })
    queryClient.invalidateQueries({ queryKey: ['sales'] })
    queryClient.invalidateQueries({ queryKey: ['stock'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['client-map'] })
  }
}

export function useCreateClient() {
  const refresh = useRefreshClients()
  return useMutation({
    mutationFn: ({ input, files }: { input: ClientInput; files: File[] }) =>
      createClient(input, files),
    onSuccess: refresh,
    // Field errors are shown in the form
    onError: () => {},
  })
}

export function useUpdateClient() {
  const refresh = useRefreshClients()
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: ClientChanges }) =>
      updateClient(id, changes),
    onSuccess: refresh,
    onError: () => {},
  })
}

export function useDeleteClient() {
  const refresh = useRefreshClients()
  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: refresh,
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Unable to delete the outlet.')),
  })
}

export function useAddClientFiles() {
  const refresh = useRefreshClients()
  return useMutation({
    mutationFn: ({ id, files }: { id: string; files: File[] }) =>
      addClientFiles(id, files),
    onSuccess: refresh,
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Unable to add the files.')),
  })
}

export function useRemoveClientFile() {
  const refresh = useRefreshClients()
  return useMutation({
    mutationFn: ({ id, fileId }: { id: string; fileId: string }) =>
      removeClientFile(id, fileId),
    onSuccess: refresh,
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Unable to remove the file.')),
  })
}
