/**
 * Browser GPS for site photos. The reading is whatever the device reports:
 * it is never invented, rounded or filled in when the browser cannot provide it.
 */
export type GpsReading = {
  latitude: number
  longitude: number
  /** Metres (the browser's 95% confidence radius) */
  accuracy: number
  /** ISO date-time of the position fix */
  capturedAt: string
}

export type GpsErrorCode =
  | 'unsupported'
  | 'insecure'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'invalid'

export class GpsError extends Error {
  constructor(readonly code: GpsErrorCode) {
    super(GPS_ERROR_MESSAGES[code])
    this.name = 'GpsError'
  }
}

export const GPS_ERROR_MESSAGES: Record<GpsErrorCode, string> = {
  unsupported:
    'កម្មវិធីរុករកនេះមិនគាំទ្រ GPS · This browser cannot provide a location',
  insecure:
    'GPS ត្រូវការ HTTPS · Location needs a secure (https) link to this form',
  denied:
    'មិនមានការអនុញ្ញាតទីតាំង · Location permission was denied. Allow it in the browser settings and retry',
  unavailable:
    'រកទីតាំងមិនឃើញ · Location unavailable. Turn on GPS / location services and retry',
  timeout:
    'រកទីតាំងយូរពេក · Location took too long. Move to an open area and retry',
  invalid: 'ទីតាំងមិនត្រឹមត្រូវ · The device reported an invalid location',
}

/**
 * Location is optional on the form, so a slow or missing fix must not hold the
 * upload up for long: give up after 8 s, and reuse a fix up to 30 s old (photos
 * taken together share it, and it is still the same place)
 */
export const GPS_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 8000,
  maximumAge: 30_000,
}

type PermissionsLike = Pick<Permissions, 'query'>

/** True only when the browser already knows location is blocked for this site */
async function isLocationBlocked(permissions?: PermissionsLike | null) {
  if (!permissions) return false
  try {
    const status = await permissions.query({ name: 'geolocation' })
    return status.state === 'denied'
  } catch {
    // Older browsers cannot ask; just try
    return false
  }
}

/** Above this radius the reading is kept but flagged so the user can retry */
export const LOW_ACCURACY_METERS = 100

export const isLowAccuracy = (reading: GpsReading) =>
  reading.accuracy > LOW_ACCURACY_METERS

/** Same ranges the backend enforces */
export function isValidReading(reading: GpsReading) {
  const { latitude, longitude, accuracy } = reading
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Number.isFinite(accuracy) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    accuracy >= 0 &&
    !Number.isNaN(Date.parse(reading.capturedAt))
  )
}

type GeolocationLike = Pick<Geolocation, 'getCurrentPosition'>

/** A position from the device as a reading, or undefined when it is not usable */
function toReading(position: GeolocationPosition): GpsReading | undefined {
  const time = new Date(position.timestamp)
  if (Number.isNaN(time.getTime())) return undefined
  const reading: GpsReading = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    capturedAt: time.toISOString(),
  }
  return isValidReading(reading) ? reading : undefined
}

/**
 * While the form is open and location is allowed, the device keeps reporting
 * its position, so a photo gets its location at once instead of waiting for a
 * new fix. Kept per GPS source (tests use their own) and trusted for 2 minutes:
 * with the watch running, no newer report means the phone has not moved.
 */
const WARM_FIX_MAX_AGE_MS = 120_000
const warmFixes = new WeakMap<object, { reading: GpsReading; at: number }>()

/** Starts keeping a fresh position; returns the function that stops it */
export function startGpsWarmup(
  geolocation: Pick<
    Geolocation,
    'watchPosition' | 'clearWatch'
  > | null = typeof navigator === 'undefined' ? null : navigator.geolocation
) {
  if (!geolocation) return () => {}
  const source = geolocation
  const id = source.watchPosition(
    (position) => {
      const reading = toReading(position)
      if (reading) warmFixes.set(source, { reading, at: Date.now() })
    },
    // A failed report just means readGps asks the device itself
    () => {},
    { enableHighAccuracy: true, maximumAge: GPS_OPTIONS.maximumAge }
  )
  return () => {
    source.clearWatch(id)
    warmFixes.delete(source)
  }
}

const ERROR_CODES: Record<number, GpsErrorCode> = {
  1: 'denied',
  2: 'unavailable',
  3: 'timeout',
}

/**
 * One high-accuracy reading. Rejects with a GpsError; the arguments exist so
 * tests can stand in for the browser. When location is already blocked for the
 * site it fails at once instead of waiting for the device.
 */
export async function readGps({
  geolocation = typeof navigator === 'undefined'
    ? undefined
    : navigator.geolocation,
  secure = typeof window === 'undefined' ? true : window.isSecureContext,
  permissions = typeof navigator === 'undefined'
    ? undefined
    : navigator.permissions,
}: {
  geolocation?: GeolocationLike | null
  secure?: boolean
  permissions?: PermissionsLike | null
} = {}) {
  // Browsers only share location with https pages (and localhost)
  if (!secure) throw new GpsError('insecure')
  if (!geolocation) throw new GpsError('unsupported')
  if (await isLocationBlocked(permissions)) throw new GpsError('denied')

  const warm = warmFixes.get(geolocation)
  if (warm && Date.now() - warm.at <= WARM_FIX_MAX_AGE_MS) return warm.reading

  return new Promise<GpsReading>((resolve, reject) => {
    geolocation.getCurrentPosition(
      (position) => {
        const reading = toReading(position)
        if (reading) resolve(reading)
        else reject(new GpsError('invalid'))
      },
      (error) => reject(new GpsError(ERROR_CODES[error.code] ?? 'unavailable')),
      GPS_OPTIONS
    )
  })
}
