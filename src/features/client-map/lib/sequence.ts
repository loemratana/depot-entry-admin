import { type MapPoint } from '../data/api'

const time = (point: MapPoint) => {
  const value = point.capturedAt ? Date.parse(point.capturedAt) : NaN
  return Number.isNaN(value) ? Infinity : value
}

/**
 * Capture order of the shown photos: oldest first, ties broken by id so the
 * order is stable. It is the order photos were taken, not a travelled route.
 */
export function captureSequence(points: MapPoint[]) {
  const ordered = [...points].sort(
    (a, b) => time(a) - time(b) || a.id.localeCompare(b.id)
  )
  return {
    /** Point id → 1-based position in the sequence */
    numbers: new Map(ordered.map((point, index) => [point.id, index + 1])),
    /** [lat, lng] pairs for the sequence line; empty when there is nothing to join */
    path:
      ordered.length > 1
        ? ordered.map((p) => [p.latitude, p.longitude] as [number, number])
        : [],
  }
}
