import { describe, expect, it } from 'vitest'
import { type MapPoint } from '../data/api'
import { captureSequence } from './sequence'

const point = (
  id: string,
  capturedAt: string | null,
  latitude = 11,
  longitude = 104
) => ({ id, capturedAt, latitude, longitude }) as MapPoint

describe('captureSequence', () => {
  it('numbers photos oldest first and joins them in that order', () => {
    const { numbers, path } = captureSequence([
      point('c', '2026-09-29T03:00:00Z', 13, 103),
      point('a', '2026-09-29T01:00:00Z', 11, 101),
      point('b', '2026-09-29T02:00:00Z', 12, 102),
    ])
    expect([...numbers]).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ])
    expect(path).toEqual([
      [11, 101],
      [12, 102],
      [13, 103],
    ])
  })

  it('keeps a stable order for equal times and puts missing times last', () => {
    const { numbers } = captureSequence([
      point('z', null),
      point('b', '2026-09-29T01:00:00Z'),
      point('a', '2026-09-29T01:00:00Z'),
    ])
    expect([...numbers.keys()]).toEqual(['a', 'b', 'z'])
  })

  it('draws no line for a single point or no points', () => {
    const single = captureSequence([point('a', '2026-09-29T01:00:00Z')])
    expect(single.numbers.get('a')).toBe(1)
    expect(single.path).toEqual([])

    const none = captureSequence([])
    expect(none.numbers.size).toBe(0)
    expect(none.path).toEqual([])
  })
})
