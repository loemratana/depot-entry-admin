import { describe, expect, it, vi } from 'vitest'
import {
  GPS_OPTIONS,
  GpsError,
  isLowAccuracy,
  isValidReading,
  readGps,
} from './geolocation'

const fix = (
  coords: Partial<GeolocationCoordinates> = {},
  timestamp = Date.parse('2026-09-29T05:40:00Z')
) =>
  ({
    coords: { latitude: 11.5564, longitude: 104.9282, accuracy: 12, ...coords },
    timestamp,
  }) as GeolocationPosition

/** Stand-in for navigator.geolocation that succeeds or fails with a code */
const fakeGeolocation = (result: GeolocationPosition | { code: number }) => ({
  getCurrentPosition: vi.fn(
    (
      success: PositionCallback,
      failure?: PositionErrorCallback | null,
      options?: PositionOptions
    ) => {
      void options
      if ('coords' in result) success(result)
      else failure?.(result as GeolocationPositionError)
    }
  ),
})

const codeOf = async (promise: Promise<unknown>) => {
  try {
    await promise
    return 'resolved'
  } catch (error) {
    return error instanceof GpsError ? error.code : 'other'
  }
}

describe('readGps', () => {
  it('returns the reported position with high-accuracy, no-cache options', async () => {
    const geolocation = fakeGeolocation(fix())
    const reading = await readGps({ geolocation, secure: true })
    expect(reading).toEqual({
      latitude: 11.5564,
      longitude: 104.9282,
      accuracy: 12,
      capturedAt: '2026-09-29T05:40:00.000Z',
    })
    expect(geolocation.getCurrentPosition.mock.calls[0][2]).toEqual({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    })
    expect(GPS_OPTIONS.maximumAge).toBe(0)
  })

  it('maps permission denied, unavailable and timeout', async () => {
    for (const [code, expected] of [
      [1, 'denied'],
      [2, 'unavailable'],
      [3, 'timeout'],
    ] as const) {
      expect(
        await codeOf(
          readGps({ geolocation: fakeGeolocation({ code }), secure: true })
        )
      ).toBe(expected)
    }
  })

  it('reports an unsupported browser and a non-https page without asking', async () => {
    expect(await codeOf(readGps({ geolocation: null, secure: true }))).toBe(
      'unsupported'
    )
    const geolocation = fakeGeolocation(fix())
    expect(await codeOf(readGps({ geolocation, secure: false }))).toBe(
      'insecure'
    )
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled()
  })

  it('rejects invalid coordinates instead of passing them on', async () => {
    for (const coords of [
      { latitude: 91 },
      { longitude: -181 },
      { accuracy: -1 },
      { latitude: Number.NaN },
    ]) {
      expect(
        await codeOf(
          readGps({ geolocation: fakeGeolocation(fix(coords)), secure: true })
        )
      ).toBe('invalid')
    }
    expect(
      await codeOf(
        readGps({
          geolocation: fakeGeolocation(fix({}, Number.NaN)),
          secure: true,
        })
      )
    ).toBe('invalid')
  })
})

describe('reading checks', () => {
  const reading = {
    latitude: 11.5,
    longitude: 104.9,
    accuracy: 12,
    capturedAt: '2026-09-29T05:40:00.000Z',
  }

  it('flags low accuracy above 100 m but keeps it valid', () => {
    expect(isLowAccuracy(reading)).toBe(false)
    expect(isLowAccuracy({ ...reading, accuracy: 350 })).toBe(true)
    expect(isValidReading({ ...reading, accuracy: 350 })).toBe(true)
  })

  it('validates ranges like the backend', () => {
    expect(isValidReading(reading)).toBe(true)
    expect(isValidReading({ ...reading, latitude: -90.1 })).toBe(false)
    expect(isValidReading({ ...reading, longitude: 180.1 })).toBe(false)
    expect(isValidReading({ ...reading, capturedAt: 'nope' })).toBe(false)
  })
})
