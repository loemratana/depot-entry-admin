/**
 * Leaflet + OpenStreetMap view. All map-library code lives in this file so
 * another provider (or marker clustering) can be swapped in later.
 * No API key, no billing: tiles come from the public OSM tile server.
 */
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import L, { type LatLngTuple } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ImageOff, MapPin } from 'lucide-react'
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime, formatPhone } from '@/features/clients/lib/format'
import { type MapPoint } from '../data/api'
import { captureSequence } from '../lib/sequence'
import './outlet-map.css'

// Fallback view: all of Cambodia. The admin's own location is never used
const CAMBODIA_CENTER: LatLngTuple = [12.5657, 104.991]
const CAMBODIA_ZOOM = 7
// The map stays within Cambodia (with a small margin): no panning or zooming out to other countries
const CAMBODIA_BOUNDS = L.latLngBounds([9.6, 102.0], [15.0, 108.0])
const MIN_ZOOM = 6
// Street level, without zooming in so far that the surroundings disappear
const SINGLE_POINT_ZOOM = 15
const FOCUS_ZOOM = 16
const FIT_MAX_ZOOM = 15

// Card size: photo on top, outlet name underneath, small pointer at the bottom
const CARD_WIDTH = 64
const CARD_HEIGHT = 66 // borders 4 + photo 40 + name 16 + pointer 6

/** Outlet names come from the public form, so they are escaped before going into HTML */
const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!
  )

/*
 * Markers are plain HTML (divIcon), so Leaflet's default PNG marker, which
 * Vite does not resolve, is never used. Each marker is a small card with the
 * site photo and the outlet name; numbered when the capture sequence is shown.
 * The photo loads lazily; if it cannot load, a grey placeholder stays.
 */
const iconCache = new Map<string, L.DivIcon>()
function markerIcon(
  point: MapPoint,
  label: number | undefined,
  selected: boolean
) {
  const key = `${point.id}|${point.photoUrl}|${point.clientName}|${label ?? ''}|${selected}`
  let icon = iconCache.get(key)
  if (!icon) {
    const name = escapeHtml(point.clientName)
    const photo = escapeHtml(point.photoUrl)
    icon = L.divIcon({
      className: '',
      html:
        `<div class="outlet-card${selected ? ' outlet-card--selected' : ''}">` +
        `<div class="outlet-card__photo"><img src="${photo}" alt="" loading="lazy" decoding="async" onerror="this.remove()"></div>` +
        `<div class="outlet-card__name" title="${name}">${name}</div>` +
        (label ? `<span class="outlet-card__number">${label}</span>` : '') +
        `</div>`,
      iconSize: [CARD_WIDTH, CARD_HEIGHT],
      // The pointer tip sits exactly on the GPS position
      iconAnchor: [CARD_WIDTH / 2, CARD_HEIGHT],
      popupAnchor: [0, -CARD_HEIGHT - 4],
    })
    iconCache.set(key, icon)
  }
  return icon
}

// Khmer place names, English only when a Khmer name is missing
const place = (kh: string, en: string) => kh || en

function PhotoPreview({ url }: { url: string }) {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading')
  if (state === 'error') {
    return (
      <div className='flex aspect-video flex-col items-center justify-center gap-1 rounded-md bg-muted text-xs text-muted-foreground'>
        <ImageOff className='size-4' />
        Photo unavailable
      </div>
    )
  }
  return (
    <div className='relative aspect-video overflow-hidden rounded-md bg-muted'>
      {state === 'loading' && <Skeleton className='absolute inset-0' />}
      <img
        src={url}
        alt='Site photo'
        loading='lazy'
        decoding='async'
        onLoad={() => setState('loaded')}
        onError={() => setState('error')}
        className='size-full object-cover'
      />
    </div>
  )
}

/** Rendered by react-leaflet only while the popup is open, so photos load on demand */
function PointPopup({
  point,
  sequenceNumber,
  onViewDetails,
}: {
  point: MapPoint
  sequenceNumber?: number
  onViewDetails: (point: MapPoint) => void
}) {
  const captured = formatDateTime(point.capturedAt)
  return (
    <div className='grid w-60 gap-3 text-sm'>
      <div className='min-w-0'>
        <p className='flex items-center gap-1.5 font-semibold'>
          {sequenceNumber && (
            <span className='rounded bg-muted px-1.5 text-xs font-medium text-muted-foreground tabular-nums'>
              {sequenceNumber}
            </span>
          )}
          <span className='truncate'>{point.clientName}</span>
        </p>
        <p className='text-muted-foreground tabular-nums'>
          {formatPhone(point.phone)}
        </p>
      </div>

      <PhotoPreview key={point.photoUrl} url={point.photoUrl} />

      <div className='flex gap-2 leading-snug'>
        <MapPin className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
        <div className='min-w-0'>
          <p className='font-medium'>
            {place(point.provinceNameKh, point.provinceNameEn)}
          </p>
          <p>{place(point.districtNameKh, point.districtNameEn)}</p>
          <p>{place(point.communeNameKh, point.communeNameEn)}</p>
        </div>
      </div>

      <dl className='grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs'>
        <dt className='text-muted-foreground'>GPS accuracy</dt>
        <dd className='text-end tabular-nums'>
          {point.accuracy != null ? `±${Math.round(point.accuracy)} m` : '—'}
        </dd>
        <dt className='text-muted-foreground'>Captured</dt>
        <dd className='text-end tabular-nums'>{captured ?? '—'}</dd>
      </dl>

      <Button size='sm' variant='outline' onClick={() => onViewDetails(point)}>
        View details
      </Button>
    </div>
  )
}

/**
 * Fits the view when the shown points change or "Fit locations" is pressed
 * (not on every render): the focused marker if any, otherwise all markers,
 * one marker, or the whole of Cambodia.
 */
function FitView({
  points,
  focusId,
  fitSignal,
  markers,
}: {
  points: MapPoint[]
  focusId?: string
  fitSignal: number
  markers: React.RefObject<Map<string, L.Marker>>
}) {
  const map = useMap()
  const key = `${focusId ?? ''}|${fitSignal}|${points.map((p) => p.id).join(',')}`

  useEffect(() => {
    const focus = focusId ? points.find((p) => p.id === focusId) : undefined
    if (focus) {
      map.setView([focus.latitude, focus.longitude], FOCUS_ZOOM)
      // After the markers have been added to the map
      const timer = setTimeout(() => markers.current.get(focus.id)?.openPopup())
      return () => clearTimeout(timer)
    }
    if (points.length === 0) map.setView(CAMBODIA_CENTER, CAMBODIA_ZOOM)
    else if (points.length === 1)
      map.setView([points[0].latitude, points[0].longitude], SINGLE_POINT_ZOOM)
    else
      map.fitBounds(
        L.latLngBounds(points.map((p) => [p.latitude, p.longitude])),
        { padding: [48, 48], maxZoom: FIT_MAX_ZOOM }
      )
    // Only re-fit when the shown points, the focus or the fit request change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map])

  return null
}

type OutletMapProps = {
  points: MapPoint[]
  showSequence: boolean
  /** Point (photo file) id to centre on and open */
  focusId?: string
  /** Increment to fit the view to the points again */
  fitSignal: number
  onViewDetails: (point: MapPoint) => void
}

export const OutletMap = memo(function OutletMap({
  points,
  showSequence,
  focusId,
  fitSignal,
  onViewDetails,
}: OutletMapProps) {
  const markers = useRef(new Map<string, L.Marker>())
  // The marker whose popup is open is drawn larger
  const [openId, setOpenId] = useState<string | null>(null)
  const sequence = useMemo(
    () => (showSequence ? captureSequence(points) : null),
    [points, showSequence]
  )

  return (
    <MapContainer
      center={CAMBODIA_CENTER}
      zoom={CAMBODIA_ZOOM}
      minZoom={MIN_ZOOM}
      maxBounds={CAMBODIA_BOUNDS}
      maxBoundsViscosity={1}
      scrollWheelZoom
      className='outlet-map size-full'
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url='https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        maxZoom={19}
        bounds={CAMBODIA_BOUNDS}
      />
      {sequence && sequence.path.length > 1 && (
        <Polyline
          positions={sequence.path}
          pathOptions={{
            color: '#2563eb',
            weight: 2,
            opacity: 0.6,
            dashArray: '4 6',
          }}
        />
      )}
      {points.map((point) => {
        const number = sequence?.numbers.get(point.id)
        return (
          <Marker
            key={point.id}
            position={[point.latitude, point.longitude]}
            icon={markerIcon(
              point,
              number,
              point.id === openId || (!openId && point.id === focusId)
            )}
            // Selected marker stays on top of its neighbours
            zIndexOffset={point.id === openId ? 1000 : 0}
            eventHandlers={{
              popupopen: () => setOpenId(point.id),
              popupclose: () =>
                setOpenId((current) => (current === point.id ? null : current)),
            }}
            ref={(marker) => {
              if (marker) markers.current.set(point.id, marker)
              else markers.current.delete(point.id)
            }}
          >
            <Popup minWidth={240} maxWidth={260} autoPanPadding={[24, 24]}>
              <PointPopup
                point={point}
                sequenceNumber={number}
                onViewDetails={onViewDetails}
              />
            </Popup>
          </Marker>
        )
      })}
      <FitView
        points={points}
        focusId={focusId}
        fitSignal={fitSignal}
        markers={markers}
      />
    </MapContainer>
  )
})
