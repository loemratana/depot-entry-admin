/**
 * Client-side mirror of the backend upload rules, so clients get instant feedback.
 * The backend stays the authority (it also verifies file contents).
 */
export const MAX_FILES = 10
export const MAX_FILE_SIZE_MB = 10
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
export const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const
export const ACCEPT_ATTRIBUTE = ACCEPTED_TYPES.join(',')

export type FileProblem = { name: string; reason: string }

/**
 * Adds newly picked files to the current list, skipping exact duplicates and
 * reporting files that are the wrong type, too large, or over the count limit.
 * `maxFiles` is lower when site photos already use part of the allowance.
 */
export function mergeFiles(
  current: File[],
  picked: File[],
  maxFiles: number = MAX_FILES
) {
  const problems: FileProblem[] = []
  const next = [...current]
  const key = (file: File) => `${file.name}|${file.size}|${file.lastModified}`
  const seen = new Set(current.map(key))

  for (const file of picked) {
    if (seen.has(key(file))) continue
    if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
      problems.push({
        name: file.name,
        reason: 'ប្រភេទឯកសារមិនត្រូវបានអនុញ្ញាត · Only JPG, PNG, WebP or PDF',
      })
    } else if (file.size > MAX_FILE_SIZE_BYTES) {
      problems.push({
        name: file.name,
        reason: `ធំជាង ${MAX_FILE_SIZE_MB}MB · Larger than ${MAX_FILE_SIZE_MB} MB`,
      })
    } else if (file.size === 0) {
      problems.push({ name: file.name, reason: 'ឯកសារទទេ · File is empty' })
    } else if (next.length >= maxFiles) {
      problems.push({
        name: file.name,
        reason: `អតិបរមា ${MAX_FILES} ឯកសារ · Maximum ${MAX_FILES} files`,
      })
    } else {
      next.push(file)
      seen.add(key(file))
    }
  }

  return { files: next, problems }
}

/**
 * Random key for the Idempotency-Key header. Uses getRandomValues, which,
 * unlike crypto.randomUUID, also works when the form is opened over plain
 * http on a LAN address.
 */
export function createIdempotencyKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Same rule as the backend: spaces/dashes/dots ignored, +855 → 0, then 0 + 8–9 digits */
export function normalizePhone(value: string) {
  let digits = value.trim().replace(/[\s\-.()]/g, '')
  if (digits.startsWith('+855')) digits = `0${digits.slice(4)}`
  else if (digits.startsWith('00855')) digits = `0${digits.slice(5)}`
  else if (digits.startsWith('855') && digits.length >= 11)
    digits = `0${digits.slice(3)}`
  return digits
}

export const PHONE_PATTERN = /^0\d{8,9}$/
