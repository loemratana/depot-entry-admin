import { useCallback, useEffect, useState } from 'react'
import {
  GpsError,
  type GpsErrorCode,
  type GpsReading,
  readGps,
} from './geolocation'

/**
 * Whether this site may use location:
 * - `prompt`: not asked yet (or the browser cannot tell); tapping Allow asks
 * - `granted` / `denied`: the browser's answer; only the user can undo `denied`
 * - `insecure` / `unsupported`: location cannot work on this link or browser
 */
export type LocationAccess =
  | 'checking'
  | 'prompt'
  | 'granted'
  | 'denied'
  | 'insecure'
  | 'unsupported'

type PermissionsLike = Pick<Permissions, 'query'>

type Options = {
  permissions?: PermissionsLike | null
  geolocation?: Pick<Geolocation, 'getCurrentPosition'> | null
  secure?: boolean
}

const browserDefaults = (): Required<Options> => ({
  permissions: typeof navigator === 'undefined' ? null : navigator.permissions,
  geolocation: typeof navigator === 'undefined' ? null : navigator.geolocation,
  secure: typeof window === 'undefined' ? true : window.isSecureContext,
})

/**
 * Watches the location permission and follows it live: when the user allows
 * location in the browser settings and comes back, `access` turns `granted`
 * without a reload. The arguments exist so tests can stand in for the browser.
 */
export function useLocationPermission(options: Options = {}) {
  const { permissions, geolocation, secure } = {
    ...browserDefaults(),
    ...options,
  }
  const [access, setAccess] = useState<LocationAccess>(
    !secure ? 'insecure' : !geolocation ? 'unsupported' : 'checking'
  )
  // Why the last attempt failed when permission itself is fine (GPS off, slow fix)
  const [problem, setProblem] = useState<GpsErrorCode>()
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    if (!secure || !geolocation) return
    let status: PermissionStatus | undefined
    let cancelled = false
    const apply = (state: PermissionState) => {
      if (cancelled) return
      setAccess(state)
      if (state !== 'granted') setProblem(undefined)
    }
    const onChange = () => status && apply(status.state)
    const check = async () => {
      if (!permissions) return apply('prompt')
      try {
        const next = await permissions.query({ name: 'geolocation' })
        if (cancelled) return
        if (status !== next) {
          status?.removeEventListener('change', onChange)
          status = next
          status.addEventListener('change', onChange)
        }
        apply(next.state)
      } catch {
        // Older browsers cannot tell; the Allow button just asks
        apply('prompt')
      }
    }
    // Some phones do not fire `change` after the settings app; check again on return
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check()
    }
    void check()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      status?.removeEventListener('change', onChange)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [permissions, geolocation, secure])

  /**
   * Asks for location (the browser shows its Allow / Block popup when not
   * asked yet) and returns the reading, or undefined when it failed.
   */
  const request = useCallback(async (): Promise<GpsReading | undefined> => {
    setRequesting(true)
    try {
      const reading = await readGps({ permissions, geolocation, secure })
      setAccess('granted')
      setProblem(undefined)
      return reading
    } catch (error) {
      const code = error instanceof GpsError ? error.code : 'unavailable'
      if (code === 'denied') {
        setAccess('denied')
        setProblem(undefined)
      } else if (code === 'insecure' || code === 'unsupported') {
        setAccess(code)
      } else {
        // Permission is fine; the phone could not give a position
        setProblem(code)
      }
      return undefined
    } finally {
      setRequesting(false)
    }
  }, [permissions, geolocation, secure])

  return { access, problem, requesting, request }
}

export type LocationDevice =
  | 'android'
  | 'iphone-safari'
  | 'iphone-chrome'
  | 'computer'

/** Which settings steps to show */
export function detectDevice(
  userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent,
  maxTouchPoints = typeof navigator === 'undefined'
    ? 0
    : navigator.maxTouchPoints
): LocationDevice {
  // iPads report themselves as a Mac with a touch screen
  const ios =
    /iPhone|iPad|iPod/.test(userAgent) ||
    (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
  if (ios) return /CriOS/.test(userAgent) ? 'iphone-chrome' : 'iphone-safari'
  if (/Android/.test(userAgent)) return 'android'
  return 'computer'
}
