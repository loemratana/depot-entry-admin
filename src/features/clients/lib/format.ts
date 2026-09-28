import { format, isValid, parseISO } from 'date-fns'
import { type NamedLocation } from '../data/schema'

/** `012345678` → `012 345 678`, `0123456789` → `012 345 6789`; anything else unchanged */
export function formatPhone(phone: string) {
  const trimmed = phone.trim()
  const digits = trimmed.replace(/[\s-]/g, '')
  if (!/^0\d{8,9}$/.test(digits)) return trimmed
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
}

export function formatSubmittedAt(value: string | null) {
  const date = value ? parseISO(value) : null
  if (!date || !isValid(date)) return null
  return {
    date: format(date, 'd MMM yyyy'),
    time: format(date, 'h:mm a'),
  }
}

/** One-line "28 Sep 2026 · 10:32 AM", or null when missing/invalid */
export function formatDateTime(value: string | null) {
  const parts = formatSubmittedAt(value)
  return parts ? `${parts.date} · ${parts.time}` : null
}

/** Primary display name; English first for admin staff, Khmer as fallback */
export function locationName(location: NamedLocation | null | undefined) {
  return location?.nameEn || location?.nameKh || ''
}

export function formatFileSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Calendar date ↔ `yyyy-MM-dd` string used in the URL and API */
export function toIsoDate(date: Date | undefined) {
  return date ? format(date, 'yyyy-MM-dd') : undefined
}

export function fromIsoDate(value: string | undefined) {
  if (!value) return undefined
  const date = parseISO(value)
  return isValid(date) ? date : undefined
}
