import { stageSitePhoto } from '../data/api'

/**
 * Uploads each photo in the background as soon as it is shrunk, while the user
 * is still filling in the form, so Submit only sends the form and the photos'
 * uploadIds. 2 uploads run at a time so a weak connection is not split too thin.
 *
 * Never fails: a photo whose upload did not work resolves to undefined and is
 * sent with the form on Submit instead, as before.
 */
const MAX_AT_ONCE = 2
const RETRY_DELAY_MS = 1500
let running = 0
const waiting: (() => void)[] = []
const uploads = new Map<string, Promise<string | undefined>>()

async function inQueue<T>(task: () => Promise<T>) {
  if (running >= MAX_AT_ONCE) await new Promise<void>((go) => waiting.push(go))
  running++
  try {
    return await task()
  } finally {
    running--
    waiting.shift()?.()
  }
}

/** One retry, for a brief connection drop */
async function stageWithRetry(file: File, endpoint: string) {
  try {
    return await stageSitePhoto(file, endpoint)
  } catch {
    await new Promise((wait) => setTimeout(wait, RETRY_DELAY_MS))
    try {
      return await stageSitePhoto(file, endpoint)
    } catch {
      return undefined
    }
  }
}

/** Starts uploading a photo; resolves to its uploadId, or undefined if it failed */
export function uploadPhotoInBackground(
  photoId: string,
  file: File,
  endpoint: string
) {
  const upload = inQueue(() => stageWithRetry(file, endpoint))
  uploads.set(photoId, upload)
  return upload
}

/** The photo's background upload, if one was started (Submit waits for it) */
export const waitForPhotoUpload = (photoId: string) =>
  uploads.get(photoId) ?? Promise.resolve(undefined)

/** Forgets a photo's upload (removed, sent, or its uploadId no longer valid) */
export const forgetPhotoUpload = (photoId: string) => uploads.delete(photoId)
