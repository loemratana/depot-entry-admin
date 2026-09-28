import { describe, expect, it } from 'vitest'
import {
  MAX_FILES,
  MAX_FILE_SIZE_BYTES,
  PHONE_PATTERN,
  createIdempotencyKey,
  mergeFiles,
  normalizePhone,
} from './files'

const file = (name: string, type: string, size = 100) =>
  new File([new Uint8Array(size)], name, { type, lastModified: 1 })

describe('mergeFiles', () => {
  it('accepts images and PDFs', () => {
    const { files, problems } = mergeFiles(
      [],
      [file('a.jpg', 'image/jpeg'), file('b.pdf', 'application/pdf')]
    )
    expect(files).toHaveLength(2)
    expect(problems).toEqual([])
  })

  it('rejects other types, empty and oversized files', () => {
    const { files, problems } = mergeFiles(
      [],
      [
        file('a.docx', 'application/msword'),
        file('b.png', 'image/png', 0),
        new File([new Uint8Array(MAX_FILE_SIZE_BYTES + 1)], 'c.png', {
          type: 'image/png',
        }),
      ]
    )
    expect(files).toHaveLength(0)
    expect(problems.map((p) => p.name)).toEqual(['a.docx', 'b.png', 'c.png'])
  })

  it('skips exact duplicates and enforces the file count limit', () => {
    const existing = Array.from({ length: MAX_FILES - 1 }, (_, i) =>
      file(`f${i}.png`, 'image/png')
    )
    const { files, problems } = mergeFiles(existing, [
      existing[0],
      file('new-1.png', 'image/png'),
      file('new-2.png', 'image/png'),
    ])
    expect(files).toHaveLength(MAX_FILES)
    expect(problems.map((p) => p.name)).toEqual(['new-2.png'])
  })
})

describe('normalizePhone', () => {
  it('matches the backend rules', () => {
    expect(normalizePhone(' 012 345-678 ')).toBe('012345678')
    expect(normalizePhone('+855 12 345 678')).toBe('012345678')
    expect(PHONE_PATTERN.test(normalizePhone('0123456789'))).toBe(true)
    expect(PHONE_PATTERN.test(normalizePhone('12345678'))).toBe(false)
  })
})

describe('createIdempotencyKey', () => {
  it('creates unique keys the backend accepts', () => {
    const a = createIdempotencyKey()
    expect(a).toMatch(/^[A-Za-z0-9._:-]{8,128}$/)
    expect(createIdempotencyKey()).not.toBe(a)
  })
})
