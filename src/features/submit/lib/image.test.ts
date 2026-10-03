import { describe, expect, it } from 'vitest'
import { compressImage, compressImageQueued } from './image'

/** A photo-like image: random noise, so it cannot be stored compactly */
async function makeImage(
  width: number,
  height: number,
  type: string,
  quality = 0.95
) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const data = ctx.createImageData(width, height)
  for (let i = 0; i < data.data.length; i += 4) {
    data.data[i] = Math.floor(Math.random() * 256)
    data.data[i + 1] = Math.floor(Math.random() * 256)
    data.data[i + 2] = Math.floor(Math.random() * 256)
    data.data[i + 3] = 255
  }
  ctx.putImageData(data, 0, 0)
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), type, quality)
  )
  return new File([blob], `photo.${type.split('/')[1]}`, {
    type,
    lastModified: 1,
  })
}

const dimensions = async (file: File) => {
  const bitmap = await createImageBitmap(file)
  const size = { width: bitmap.width, height: bitmap.height }
  bitmap.close()
  return size
}

describe('compressImage', () => {
  it('shrinks a large photo to at most 1280px as a smaller JPEG', async () => {
    const original = await makeImage(4000, 3000, 'image/png')
    const result = await compressImage(original)
    expect(result.type).toBe('image/jpeg')
    expect(result.name).toBe('photo.jpg')
    expect(result.size).toBeLessThan(original.size)
    expect(await dimensions(result)).toEqual({ width: 1280, height: 960 })
  })

  it('keeps portrait orientation', async () => {
    const result = await compressImage(await makeImage(1500, 3000, 'image/png'))
    expect(await dimensions(result)).toEqual({ width: 640, height: 1280 })
  })

  it('returns the original when it cannot be made smaller', async () => {
    // Already a tiny, heavily compressed JPEG: re-encoding at 0.75 would be larger
    const tiny = await makeImage(20, 20, 'image/jpeg', 0.05)
    expect(await compressImage(tiny)).toBe(tiny)
  })

  it('returns the original when the file is not a readable image', async () => {
    const broken = new File([new Uint8Array([1, 2, 3])], 'x.jpg', {
      type: 'image/jpeg',
    })
    expect(await compressImage(broken)).toBe(broken)
  })
})

describe('compressImageQueued', () => {
  it('shrinks every photo when many are added at once', async () => {
    const files = await Promise.all(
      Array.from({ length: 5 }, () => makeImage(2400, 1800, 'image/png'))
    )
    const results = await Promise.all(files.map(compressImageQueued))
    expect(results.every((file) => file.type === 'image/jpeg')).toBe(true)
    expect(await Promise.all(results.map((file) => dimensions(file)))).toEqual(
      Array(5).fill({ width: 1280, height: 960 })
    )
  })
})
