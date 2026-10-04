import { describe, expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { detectDevice, useLocationPermission } from '../lib/location-permission'
import { LocationCard } from './location-card'

const card = (props: Partial<Parameters<typeof LocationCard>[0]> = {}) =>
  render(
    <LocationCard
      access='prompt'
      requesting={false}
      onRequest={() => {}}
      device='android'
      {...props}
    />
  )

describe('LocationCard', () => {
  it('not asked yet: an Allow button that asks', async () => {
    const onRequest = vi.fn()
    const screen = await card({ onRequest })
    await userEvent.click(
      screen.getByRole('button', { name: /Allow location/ })
    )
    expect(onRequest).toHaveBeenCalledOnce()
  })

  it('allowed: a short "Location on" line, no button', async () => {
    const screen = await card({ access: 'granted' })
    await expect.element(screen.getByText(/Location on/)).toBeInTheDocument()
    expect(screen.container.querySelector('button')).toBeNull()
  })

  it('blocked: steps for the device and a try-again button', async () => {
    const screen = await card({ access: 'denied', device: 'iphone-safari' })
    await expect
      .element(screen.getByText(/Location is blocked/))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText(/Tap "aA" in the address bar/))
      .toBeInTheDocument()
    await expect
      .element(screen.getByRole('button', { name: /I've allowed it/ }))
      .toBeInTheDocument()
  })

  it('allowed but the phone gives no position: turn on location', async () => {
    const screen = await card({ access: 'granted', problem: 'unavailable' })
    await expect.element(screen.getByText(/quick settings/)).toBeInTheDocument()
    await expect
      .element(screen.getByRole('button', { name: /Try again/ }))
      .toBeInTheDocument()
  })

  it('shows nothing while checking', async () => {
    const screen = await card({ access: 'checking' })
    expect(screen.container.querySelector('[data-testid]')).toBeNull()
  })
})

describe('detectDevice', () => {
  it('tells phones and browsers apart', () => {
    expect(
      detectDevice('Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile', 5)
    ).toBe('android')
    expect(
      detectDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Safari/604.1', 5)
    ).toBe('iphone-safari')
    expect(
      detectDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) CriOS/130', 5)
    ).toBe('iphone-chrome')
    // iPad in desktop mode looks like a Mac with touch
    expect(detectDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 5)).toBe(
      'iphone-safari'
    )
    expect(detectDevice('Mozilla/5.0 (Windows NT 10.0) Chrome/130', 0)).toBe(
      'computer'
    )
  })
})

/** Stand-ins for the browser's permission and GPS objects */
function fakeBrowser(initial: PermissionState) {
  const status = Object.assign(new EventTarget(), {
    state: initial,
  }) as unknown as PermissionStatus & { state: PermissionState }
  const permissions = { query: vi.fn(async () => status) }
  const geolocation = {
    getCurrentPosition: vi.fn((ok: PositionCallback) =>
      ok({
        coords: { latitude: 11.55, longitude: 104.92, accuracy: 10 },
        timestamp: Date.now(),
      } as GeolocationPosition)
    ),
  }
  const setState = (state: PermissionState) => {
    status.state = state
    status.dispatchEvent(new Event('change'))
  }
  return { permissions, geolocation, setState }
}

describe('useLocationPermission', () => {
  it('follows the permission live, e.g. after allowing it in settings', async () => {
    const browser = fakeBrowser('denied')
    const options = { ...browser, secure: true }
    const { result, act } = await renderHook(() =>
      useLocationPermission(options)
    )
    await expect.poll(() => result.current.access).toBe('denied')
    await act(async () => browser.setState('granted'))
    await expect.poll(() => result.current.access).toBe('granted')
  })

  it('asking returns the reading and marks location allowed', async () => {
    const browser = fakeBrowser('prompt')
    const options = { ...browser, secure: true }
    const { result, act } = await renderHook(() =>
      useLocationPermission(options)
    )
    await expect.poll(() => result.current.access).toBe('prompt')
    let reading: Awaited<ReturnType<typeof result.current.request>>
    await act(async () => {
      reading = await result.current.request()
    })
    expect(reading!).toMatchObject({ latitude: 11.55, longitude: 104.92 })
    expect(result.current.access).toBe('granted')
  })

  it('a phone with GPS off keeps permission but reports the problem', async () => {
    const browser = fakeBrowser('granted')
    browser.geolocation.getCurrentPosition.mockImplementation(
      (_ok: PositionCallback, fail?: PositionErrorCallback | null) =>
        fail?.({ code: 2 } as GeolocationPositionError)
    )
    const options = { ...browser, secure: true }
    const { result, act } = await renderHook(() =>
      useLocationPermission(options)
    )
    await act(async () => {
      await result.current.request()
    })
    expect(result.current.access).toBe('granted')
    expect(result.current.problem).toBe('unavailable')
  })

  it('on an http link it says location needs https', async () => {
    const options = { ...fakeBrowser('prompt'), secure: false }
    const { result } = await renderHook(() => useLocationPermission(options))
    expect(result.current.access).toBe('insecure')
  })
})
