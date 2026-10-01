import { saleNameKey } from './sale-name'

/**
 * A district or commune typed on the form because it is not in the list.
 * The form field keeps it as `new:<name>`; the API receives it as
 * `districtName` / `communeName` and matches or adds it.
 */
const PREFIX = 'new:'

export const MIN_TYPED_LOCATION = 2
export const MAX_TYPED_LOCATION = 100

/** Collapses whitespace so "  ឃុំ   ថ្មី " and "ឃុំ ថ្មី" are the same name */
export const cleanLocationName = (name: string) =>
  name.replace(/\s+/g, ' ').trim()

export const toTypedLocation = (name: string) =>
  `${PREFIX}${cleanLocationName(name)}`

/** The typed name, or null when the value is a picked id (or empty) */
export const typedLocationName = (value: string | undefined) =>
  value?.startsWith(PREFIX) ? value.slice(PREFIX.length) : null

/** Picked id, or undefined for a typed name (nothing to look up yet) */
export const pickedLocationId = (value: string | undefined) =>
  value && !value.startsWith(PREFIX) ? value : undefined

/** `{ districtId }` or `{ districtName }` for the API */
export const locationField = (level: 'district' | 'commune', value: string) => {
  const name = typedLocationName(value)
  return name !== null
    ? { field: `${level}Name`, value: name }
    : { field: `${level}Id`, value }
}

/** Same comparison as the backend (ignores spaces, zero-width characters, case) */
export const locationNameKey = saleNameKey
