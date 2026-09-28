import { describe, expect, it } from 'vitest'
import { normalizeSubmission } from '../data/schema'
import {
  formatDateTime,
  formatFileSize,
  formatPhone,
  formatSubmittedAt,
  fromIsoDate,
  locationName,
  toIsoDate,
} from './format'

describe('formatPhone', () => {
  it('groups 9 and 10 digit local numbers', () => {
    expect(formatPhone('012345678')).toBe('012 345 678')
    expect(formatPhone('0961234567')).toBe('096 123 4567')
    expect(formatPhone('012-345-678')).toBe('012 345 678')
  })

  it('leaves other formats untouched', () => {
    expect(formatPhone('+855 12 345 678')).toBe('+855 12 345 678')
    expect(formatPhone('12345')).toBe('12345')
  })
})

describe('formatSubmittedAt', () => {
  it('returns date and time parts', () => {
    const result = formatSubmittedAt('2026-09-28T10:32:00')
    expect(result).toEqual({ date: '28 Sep 2026', time: '10:32 AM' })
  })

  it('returns null for missing or invalid values', () => {
    expect(formatSubmittedAt(null)).toBeNull()
    expect(formatSubmittedAt('not-a-date')).toBeNull()
  })
})

describe('date helpers', () => {
  it('round-trips calendar dates as yyyy-MM-dd', () => {
    const date = fromIsoDate('2026-09-28')
    expect(date?.getDate()).toBe(28)
    expect(toIsoDate(date)).toBe('2026-09-28')
    expect(fromIsoDate('garbage')).toBeUndefined()
  })
})

describe('formatFileSize', () => {
  it('formats bytes readably', () => {
    expect(formatFileSize(null)).toBe('')
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(2048)).toBe('2 KB')
    expect(formatFileSize(3.5 * 1024 * 1024)).toBe('3.5 MB')
  })
})

describe('normalizeSubmission', () => {
  it('reads flat snapshot fields and keeps Khmer text intact', () => {
    const row = normalizeSubmission({
      _id: 'abc',
      submissionNo: 'CL-20260928-ABC123',
      clientName: 'សុខា',
      phone: '012345678',
      provinceId: 'p1',
      provinceNameKh: 'ភ្នំពេញ',
      provinceNameEn: 'Phnom Penh',
      saleGbId: 's1',
      saleGbName: 'Dara',
      submittedAt: '2026-09-28T03:32:00.000Z',
      files: [
        {
          originalName: 'id.jpg',
          mimeType: 'image/jpeg',
          size: 1000,
          url: 'https://x/1',
          uploadedAt: '2026-09-28T03:31:55.000Z',
        },
        {
          originalName: 'contract.pdf',
          mimeType: 'application/pdf',
          url: 'https://x/2',
        },
      ],
    })

    expect(row.id).toBe('abc')
    expect(row.files[0].uploadedAt).toBe('2026-09-28T03:31:55.000Z')
    expect(row.files[1].uploadedAt).toBeNull()
    expect(row.clientName).toBe('សុខា')
    expect(row.province).toEqual({
      id: 'p1',
      nameKh: 'ភ្នំពេញ',
      nameEn: 'Phnom Penh',
    })
    expect(locationName(row.province)).toBe('Phnom Penh')
    expect(row.district).toBeNull()
    expect(row.saleGb).toEqual({ id: 's1', name: 'Dara' })
    expect(row.files.map((f) => f.kind)).toEqual(['image', 'pdf'])
  })

  it('reads nested location and Sale GB objects', () => {
    const row = normalizeSubmission({
      id: 'xyz',
      province: { id: 'p1', nameKh: 'ភ្នំពេញ', nameEn: '' },
      saleGb: { id: 's1', name: 'Dara' },
    })

    expect(locationName(row.province)).toBe('ភ្នំពេញ')
    expect(row.saleGb?.name).toBe('Dara')
    expect(row.files).toEqual([])
  })
})

describe('formatDateTime', () => {
  it('joins date and time on one line', () => {
    expect(formatDateTime('2026-09-28T10:32:00')).toBe('28 Sep 2026 · 10:32 AM')
  })

  it('returns null for missing or invalid values', () => {
    expect(formatDateTime(null)).toBeNull()
    expect(formatDateTime('nope')).toBeNull()
  })
})
