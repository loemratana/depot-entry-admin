/**
 * Shrinks a photo on the device before upload: longest side at most
 * `maxDimension` px, saved as JPEG. Phone photos (often 3–10 MB) become about
 * 150 KB, so uploads over mobile data are fast (1280 px / 0.75 measured at about
 * half the size of 1600 px / 0.8, still sharp for site photos). GPS is recorded
 * separately, so the photo's own EXIF data is not needed.
 *
 * Returns the original file when it cannot be decoded here or when the result
 * would not be smaller.
 */
/**
 * Shrinks photos at most 2 at a time: each camera photo takes about 48 MB of
 * memory while decoded, so doing many at once can stall or crash a phone.
 */
const MAX_AT_ONCE = 2
let running = 0
const waiting: (() => void)[] = []

export async function compressImageQueued(file: File): Promise<File> {
  if (running >= MAX_AT_ONCE) await new Promise<void>((go) => waiting.push(go))
  running++
  try {
    return await compressImage(file)
  } finally {
    running--
    waiting.shift()?.()
  }
}

export async function compressImage(
  file: File,
  { maxDimension = 1280, quality = 0.75 } = {}
): Promise<File> {
  try {
    // Applies the EXIF rotation, so portrait photos stay upright
    const bitmap = await createImageBitmap(file, {
      imageOrientation: 'from-image',
    })
    const scale = Math.min(
      1,
      maxDimension / Math.max(bitmap.width, bitmap.height)
    )
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      return file
    }
    // JPEG has no transparency: give PNGs a white background instead of black
    context.fillStyle = '#fff'
    context.fillRect(0, 0, width, height)
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    )
    if (!blob || blob.size >= file.size) return file

    const name = `${file.name.replace(/\.[^.]*$/, '') || 'photo'}.jpg`
    return new File([blob], name, {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    })
  } catch {
    return file
  }
}
