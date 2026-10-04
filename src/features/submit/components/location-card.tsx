import {
  CheckCircle2,
  Loader2,
  MapPin,
  MapPinOff,
  RotateCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { GPS_ERROR_MESSAGES, type GpsErrorCode } from '../lib/geolocation'
import {
  type LocationAccess,
  type LocationDevice,
  detectDevice,
} from '../lib/location-permission'

/** Where to allow location again, for each kind of device */
const UNBLOCK_STEPS: Record<LocationDevice, { kh: string; en: string }[]> = {
  android: [
    {
      kh: 'ចុចរូបសញ្ញានៅខាងឆ្វេងអាសយដ្ឋានវេបសាយ',
      en: 'Tap the icon to the left of the web address',
    },
    {
      kh: 'ចុច ការអនុញ្ញាត (Permissions) → ទីតាំង (Location)',
      en: 'Tap Permissions → Location',
    },
    { kh: 'ជ្រើសរើស អនុញ្ញាត (Allow)', en: 'Choose Allow' },
  ],
  'iphone-safari': [
    {
      kh: 'ចុច "aA" នៅរបារអាសយដ្ឋាន → Website Settings',
      en: 'Tap "aA" in the address bar → Website Settings',
    },
    { kh: 'ទីតាំង (Location) → អនុញ្ញាត (Allow)', en: 'Location → Allow' },
    {
      kh: 'បើនៅតែបិទ៖ Settings → Privacy & Security → Location Services → Safari Websites → While Using the App',
      en: 'Still blocked? Settings → Privacy & Security → Location Services → Safari Websites → While Using the App',
    },
  ],
  'iphone-chrome': [
    {
      kh: 'បើកកម្មវិធី Settings របស់ទូរស័ព្ទ → Chrome',
      en: "Open the phone's Settings app → Chrome",
    },
    {
      kh: 'Location → While Using the App',
      en: 'Location → While Using the App',
    },
    {
      kh: 'ត្រឡប់មកវិញ ហើយចុច ព្យាយាមម្ដងទៀត',
      en: 'Come back and tap Try again',
    },
  ],
  computer: [
    {
      kh: 'ចុចរូបសញ្ញានៅខាងឆ្វេងអាសយដ្ឋានវេបសាយ',
      en: 'Click the icon to the left of the web address',
    },
    {
      kh: 'Site settings / Location → អនុញ្ញាត (Allow)',
      en: 'Site settings / Location → Allow',
    },
  ],
}

type LocationCardProps = {
  access: LocationAccess
  problem?: GpsErrorCode
  requesting: boolean
  onRequest: () => void
  /** For tests; detected from the browser otherwise */
  device?: LocationDevice
}

/**
 * Location status at the top of the outlet form. Asks for location with a
 * button the user taps (so the browser's popup is expected, not a surprise),
 * and when location is blocked, shows where to allow it on this device.
 */
export function LocationCard({
  access,
  problem,
  requesting,
  onRequest,
  device = detectDevice(),
}: LocationCardProps) {
  if (access === 'checking') return null

  if (access === 'granted' && !problem) {
    return (
      <p
        className='flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400'
        data-testid='location-card'
        data-state='granted'
      >
        <CheckCircle2 className='size-4 shrink-0' />
        ទីតាំងបើក · Location on
      </p>
    )
  }

  const retryButton = (label: string) => (
    <Button
      type='button'
      size='sm'
      variant={access === 'denied' ? 'outline' : 'default'}
      onClick={onRequest}
      disabled={requesting}
      className='h-auto min-h-8 w-full py-1.5 whitespace-normal sm:w-auto'
    >
      {requesting ? (
        <Loader2 className='animate-spin' />
      ) : access === 'prompt' ? (
        <MapPin />
      ) : (
        <RotateCw />
      )}
      {requesting ? 'កំពុងយកទីតាំង · Getting location…' : label}
    </Button>
  )

  const tone =
    access === 'prompt'
      ? 'border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100'
      : access === 'granted'
        ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100'
        : 'border-destructive/50 bg-destructive/10 text-foreground'

  return (
    <div
      className={cn('grid gap-2 rounded-md border p-3 text-sm', tone)}
      role={access === 'prompt' ? 'region' : 'alert'}
      aria-label='Location'
      data-testid='location-card'
      data-state={access === 'granted' ? 'problem' : access}
    >
      {access === 'prompt' && (
        <>
          <p className='flex items-start gap-1.5 font-medium'>
            <MapPin className='mt-0.5 size-4 shrink-0' />
            <span>
              ត្រូវការទីតាំង ដើម្បីបញ្ជូន · Location is needed to submit
              <span className='block text-xs font-normal opacity-80'>
                ចុចប៊ូតុងខាងក្រោម ហើយជ្រើស អនុញ្ញាត (Allow) · Tap the button,
                then choose Allow.
              </span>
            </span>
          </p>
          {problem && <p className='text-xs'>{GPS_ERROR_MESSAGES[problem]}</p>}
          {retryButton('អនុញ្ញាតទីតាំង · Allow location')}
        </>
      )}

      {access === 'granted' && problem && (
        <>
          <p className='flex items-start gap-1.5 font-medium'>
            <MapPinOff className='mt-0.5 size-4 shrink-0' />
            <span>
              {GPS_ERROR_MESSAGES[problem]}
              <span className='block text-xs font-normal opacity-80'>
                បើក Location នៅក្នុង Quick settings របស់ទូរស័ព្ទ · Turn on
                Location in the phone&apos;s quick settings, then try again.
              </span>
            </span>
          </p>
          {retryButton('ព្យាយាមម្ដងទៀត · Try again')}
        </>
      )}

      {access === 'denied' && (
        <>
          <p className='flex items-start gap-1.5 font-medium text-destructive'>
            <MapPinOff className='mt-0.5 size-4 shrink-0' />
            ទីតាំងត្រូវបានបិទ · Location is blocked for this site
          </p>
          <ol className='grid list-decimal gap-1 ps-6'>
            {UNBLOCK_STEPS[device].map((s) => (
              <li key={s.en}>
                {s.kh}
                <span className='block text-xs text-muted-foreground'>
                  {s.en}
                </span>
              </li>
            ))}
          </ol>
          {retryButton("ខ្ញុំបានអនុញ្ញាតហើយ · I've allowed it, try again")}
        </>
      )}

      {(access === 'insecure' || access === 'unsupported') && (
        <p className='flex items-start gap-1.5 font-medium text-destructive'>
          <MapPinOff className='mt-0.5 size-4 shrink-0' />
          {GPS_ERROR_MESSAGES[access]}
        </p>
      )}
    </div>
  )
}
