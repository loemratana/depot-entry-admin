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

export const GPS_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
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

const ERROR_CODES: Record<number, GpsErrorCode> = {
  1: 'denied',
  2: 'unavailable',
  3: 'timeout',
}

/**
 * One fresh high-accuracy reading. Rejects with a GpsError; the arguments
 * exist so tests can stand in for the browser.
 */
export function readGps({
  geolocation = typeof navigator === 'undefined'
    ? undefined
    : navigator.geolocation,
  secure = typeof window === 'undefined' ? true : window.isSecureContext,
}: { geolocation?: GeolocationLike | null; secure?: boolean } = {}) {
  return new Promise<GpsReading>((resolve, reject) => {
    // Browsers only share location with https pages (and localhost)
    if (!secure) return reject(new GpsError('insecure'))
    if (!geolocation) return reject(new GpsError('unsupported'))

    geolocation.getCurrentPosition(
      (position) => {
        const time = new Date(position.timestamp)
        if (Number.isNaN(time.getTime())) return reject(new GpsError('invalid'))
        const reading: GpsReading = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: time.toISOString(),
        }
        if (isValidReading(reading)) resolve(reading)
        else reject(new GpsError('invalid'))
      },
      (error) => reject(new GpsError(ERROR_CODES[error.code] ?? 'unavailable')),
      GPS_OPTIONS
    )
  })
}
