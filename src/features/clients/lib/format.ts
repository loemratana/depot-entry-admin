import { format, isValid, parse, parseISO } from 'date-fns'
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

/**
 * Date filters: `yyyy-MM-dd` (the whole day) or `yyyy-MM-ddTHH:mm` (from / until
 * that minute), in Cambodia time on the server.
 */
export const FILTER_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}(T([01]\d|2[0-3]):[0-5]\d)?$/

export function splitFilterDate(value: string | undefined) {
  const [day, time = ''] = (value ?? '').split('T')
  return { date: fromIsoDate(day), time }
}

export function joinFilterDate(date: Date | undefined, time = '') {
  const day = toIsoDate(date)
  return day && time ? `${day}T${time}` : day
}

/** A date alone starts at 00:00 when it is the start of a range, and ends at 23:59 when it is the end */
const asStart = (value: string) =>
  value.includes('T') ? value : `${value}T00:00`
const asEnd = (value: string) =>
  value.includes('T') ? value : `${value}T23:59`

export function isFilterRangeValid(from?: string, to?: string) {
  return !from || !to || asStart(from) <= asEnd(to)
}

/** "19:17" → "7:17 PM", the way the lists show times */
export function formatClock(time: string) {
  const clock = parse(time, 'HH:mm', new Date(2000, 0, 1))
  return isValid(clock) ? format(clock, 'h:mm a') : time
}

/** "3 Oct 2026 · 7:17 PM" (or "3 Oct 2026" for a whole day), like the lists */
export function formatFilterDate(value: string) {
  const { date, time } = splitFilterDate(value)
  if (!date) return value
  const day = format(date, 'd MMM yyyy')
  return time ? `${day} · ${formatClock(time)}` : day
}
