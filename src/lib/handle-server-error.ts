import { AxiosError } from 'axios'
import { toast } from 'sonner'

const NETWORK_ERROR_MESSAGE =
  'Unable to reach the server. Check your connection and try again.'

/**
 * Turns any thrown value into a message that is safe to show to admins.
 * Never exposes raw Axios errors, stack traces or backend internals.
 */
export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong!'
): string {
  if (!(error instanceof AxiosError)) return fallback

  if (!error.response) {
    return error.code === AxiosError.ERR_CANCELED
      ? fallback
      : NETWORK_ERROR_MESSAGE
  }

  // Server faults carry no useful detail for the user
  if (error.response.status >= 500) return fallback

  const data = error.response.data as
    | { message?: unknown; title?: unknown }
    | undefined
  if (typeof data?.message === 'string' && data.message.length > 0) {
    return data.message
  }
  if (typeof data?.title === 'string' && data.title.length > 0) {
    return data.title
  }
  return fallback
}

export function handleServerError(error: unknown) {
  if (import.meta.env.DEV) {
    // Axios errors carry request headers (including the Bearer token), so log a summary only
    // eslint-disable-next-line no-console
    console.log(
      error instanceof AxiosError
        ? {
            message: error.message,
            status: error.response?.status,
            url: error.config?.url,
          }
        : error
    )
  }

  let errMsg = 'Something went wrong!'

  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    Number(error.status) === 204
  ) {
    errMsg = 'No content.'
  }

  if (error instanceof AxiosError) {
    const title = error.response?.data?.title
    if (typeof title === 'string' && title.length > 0) {
      errMsg = title
    } else {
      errMsg = getErrorMessage(error, errMsg)
    }
  }

  toast.error(errMsg)
}
