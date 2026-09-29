/**
 * Shrinks a photo on the device before upload: longest side at most
 * `maxDimension` px, saved as JPEG. Phone photos (often 3–10 MB) become a few
 * hundred KB, so uploads over mobile data are much faster. GPS is recorded
 * separately, so the photo's own EXIF data is not needed.
 *
 * Returns the original file when it cannot be decoded here or when the result
 * would not be smaller.
 */
export async function compressImage(
  file: File,
  { maxDimension = 1600, quality = 0.8 } = {}
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
