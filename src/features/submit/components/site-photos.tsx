import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  FileText,
  ImagePlus,
  Loader2,
  MapPinOff,
  RotateCw,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { WithTooltip } from '@/components/with-tooltip'
import { formatFileSize } from '@/features/clients/lib/format'
import {
  type FileProblem,
  MAX_FILES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  createIdempotencyKey,
  mergeFiles,
} from '../lib/files'
import { GPS_ERROR_MESSAGES, GpsError, readGps } from '../lib/geolocation'
import { compressImage } from '../lib/image'
import { type SitePhoto, isSitePhotoReady } from '../lib/site-photo'

export type { SitePhoto }

const SITE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const TOO_LARGE = `ធំជាង ${MAX_FILE_SIZE_MB}MB · Larger than ${MAX_FILE_SIZE_MB} MB`

type SitePhotosProps = {
  value: SitePhoto[]
  /** Functional update, because GPS results arrive after the photo is added */
  onUpdate: (update: (photos: SitePhoto[]) => SitePhoto[]) => void
  /** PDFs (no GPS); they share the per-submission file limit with the photos */
  documents: File[]
  onDocumentsChange: (files: File[]) => void
  disabled?: boolean
  invalid?: boolean
}

function usePreviews(photos: SitePhoto[]) {
  const previews = useMemo(
    () => new Map(photos.map((p) => [p.file, URL.createObjectURL(p.file)])),
    [photos]
  )
  useEffect(
    () => () => previews.forEach((url) => URL.revokeObjectURL(url)),
    [previews]
  )
  return previews
}

/**
 * The form's single upload box. Clicking it opens the device's file picker,
 * which on phones also offers the camera. Each photo is shrunk on
 * the device and gets its own GPS reading (never requested on page load); a
 * spinner shows until both are done. PDFs are kept as documents without GPS.
 */
export function SitePhotos({
  value,
  onUpdate,
  documents,
  onDocumentsChange,
  disabled,
  invalid,
}: SitePhotosProps) {
  // The box opens the file picker directly; on phones it also offers the camera
  const inputRef = useRef<HTMLInputElement>(null)
  const openPicker = () => inputRef.current?.click()
  const [dragging, setDragging] = useState(false)
  const remaining = MAX_FILES - value.length - documents.length
  const locked = disabled || remaining <= 0
  const [problems, setProblems] = useState<FileProblem[]>([])
  const previews = usePreviews(value)

  const patch = (photoIds: string[], changes: Partial<SitePhoto>) => {
    const ids = new Set(photoIds)
    onUpdate((photos) =>
      photos.map((p) => (ids.has(p.photoId) ? { ...p, ...changes } : p))
    )
  }

  const locate = (photoIds: string[]) => {
    patch(photoIds, { status: 'locating', error: undefined })
    readGps().then(
      (gps) => patch(photoIds, { status: 'ready', gps, error: undefined }),
      (error: unknown) =>
        patch(photoIds, {
          status: 'failed',
          gps: undefined,
          error: error instanceof GpsError ? error.code : 'unavailable',
        })
    )
  }

  // Shrinks one photo; drops it if it is still too large afterwards
  const prepare = async (photo: SitePhoto) => {
    const file = await compressImage(photo.file)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      onUpdate((photos) => photos.filter((p) => p.photoId !== photo.photoId))
      setProblems((prev) => [
        ...prev,
        { name: photo.file.name, reason: TOO_LARGE },
      ])
      return
    }
    patch([photo.photoId], { file, preparing: false })
  }

  const add = (picked: File[]) => {
    if (!picked.length) return
    const found: FileProblem[] = []
    const added: SitePhoto[] = []
    const isPdf = (file: File) => file.type === 'application/pdf'
    for (const file of picked.filter((file) => !isPdf(file))) {
      if (!SITE_PHOTO_TYPES.includes(file.type))
        found.push({
          name: file.name,
          reason: 'ប្រភេទឯកសារមិនត្រូវបានអនុញ្ញាត · Only JPG, PNG, WebP or PDF',
        })
      else if (file.size === 0)
        found.push({ name: file.name, reason: 'ឯកសារទទេ · File is empty' })
      else if (added.length >= remaining)
        found.push({
          name: file.name,
          reason: 'ឯកសារច្រើនពេក · Too many files for one submission',
        })
      else
        added.push({
          photoId: createIdempotencyKey(),
          file,
          status: 'locating',
          preparing: true,
        })
    }
    const pdfs = picked.filter(isPdf)
    if (pdfs.length) {
      // PDFs get whatever the photos left of the file limit
      const result = mergeFiles(
        documents,
        pdfs,
        documents.length + remaining - added.length
      )
      found.push(...result.problems)
      if (result.files.length !== documents.length)
        onDocumentsChange(result.files)
    }
    setProblems(found)
    if (!added.length) return
    onUpdate((photos) => [...photos, ...added])
    // Shrinking and GPS run at the same time; photos taken together share one reading
    locate(added.map((p) => p.photoId))
    for (const photo of added) void prepare(photo)
  }

  const remove = (photoId: string) => {
    setProblems([])
    onUpdate((photos) => photos.filter((p) => p.photoId !== photoId))
  }

  const failedMessages = [
    ...new Set(
      value
        .filter((p) => p.status === 'failed')
        .map((p) => GPS_ERROR_MESSAGES[p.error ?? 'unavailable'])
    ),
  ]

  return (
    <div className='grid min-w-0 gap-3'>
      <p className='text-sm text-muted-foreground'>
        ទីតាំងត្រូវបានប្រើដើម្បីកត់ត្រាកន្លែងដែលថតរូបនេះ · Location is used to
        record where this site photo was taken.
      </p>

      <div
        role='button'
        tabIndex={locked ? -1 : 0}
        aria-disabled={locked}
        aria-invalid={invalid}
        aria-label='Take a photo or choose files'
        onClick={() => !locked && openPicker()}
        onKeyDown={(e) => {
          if (!locked && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            openPicker()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (!locked) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!locked) add(Array.from(e.dataTransfer.files))
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed px-4 py-6 text-center transition-colors outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50',
          dragging && 'border-primary bg-muted/50',
          invalid && 'border-destructive',
          locked && 'pointer-events-none opacity-50'
        )}
      >
        <ImagePlus className='mb-1 size-6 text-muted-foreground' />
        <span className='text-sm font-medium'>ថតរូប ឬជ្រើសរើសឯកសារ</span>
        <span className='text-sm text-muted-foreground'>
          Take a photo or choose files
        </span>
        <span className='text-xs text-muted-foreground'>
          JPG, PNG, WebP, PDF · ≤ {MAX_FILE_SIZE_MB} MB · max {MAX_FILES}
        </span>
      </div>
      <input
        ref={inputRef}
        type='file'
        accept='image/jpeg,image/png,image/webp,application/pdf'
        multiple
        className='sr-only'
        tabIndex={-1}
        aria-label='Upload files'
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (files.length) add(files)
        }}
      />

      {problems.length > 0 && (
        <ul className='grid gap-1 text-sm text-destructive'>
          {problems.map((problem, i) => (
            <li key={`${problem.name}-${i}`} className='break-words'>
              {problem.name}: {problem.reason}
            </li>
          ))}
        </ul>
      )}

      {value.length > 0 && (
        <ul className='grid grid-cols-3 gap-2 sm:grid-cols-4'>
          {value.map((photo) => {
            const busy = photo.status === 'locating' || photo.preparing
            const failed = photo.status === 'failed'
            const ready = isSitePhotoReady(photo)
            return (
              <li
                key={photo.photoId}
                className='relative aspect-square overflow-hidden rounded-md border bg-muted'
                data-state={ready ? 'ready' : failed ? 'failed' : 'loading'}
              >
                <img
                  src={previews.get(photo.file)}
                  alt='Site photo'
                  className='size-full object-cover'
                />

                {busy && (
                  <div
                    className='absolute inset-0 flex items-center justify-center bg-black/40'
                    role='status'
                    aria-label='Loading'
                  >
                    <Loader2 className='size-6 animate-spin text-white' />
                  </div>
                )}

                {failed && !photo.preparing && (
                  // Still accepted; sent without GPS unless a retry succeeds
                  <div className='absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/60 px-1.5 py-1'>
                    <span
                      className='flex items-center gap-1 text-[10px] leading-none text-white'
                      title='No location · គ្មានទីតាំង'
                    >
                      <MapPinOff className='size-3.5 shrink-0' />
                      No GPS
                    </span>
                    <WithTooltip label='ព្យាយាមម្ដងទៀត · Try location again'>
                      <Button
                        type='button'
                        size='icon'
                        className='size-6 bg-white text-black hover:bg-white/90'
                        disabled={disabled}
                        onClick={() => locate([photo.photoId])}
                        aria-label='Try location again'
                      >
                        <RotateCw className='size-3.5' />
                      </Button>
                    </WithTooltip>
                  </div>
                )}

                {ready && !failed && (
                  <span
                    className='absolute start-1 bottom-1 flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white'
                    title='Ready'
                  >
                    <Check className='size-3.5' />
                  </span>
                )}

                <WithTooltip label='លុបរូបថត · Remove photo'>
                  <button
                    type='button'
                    disabled={disabled}
                    onClick={() => remove(photo.photoId)}
                    aria-label='Remove photo'
                    className='absolute end-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-50'
                  >
                    <X className='size-3.5' />
                  </button>
                </WithTooltip>
              </li>
            )
          })}
        </ul>
      )}

      {failedMessages.length > 0 && (
        <ul className='grid gap-1 text-sm text-muted-foreground'>
          {failedMessages.map((message) => (
            <li key={message} className='flex items-start gap-1.5'>
              <MapPinOff className='mt-0.5 size-4 shrink-0' />
              <span>
                {message}
                <span className='block text-xs'>
                  រូបថតនឹងផ្ញើដោយគ្មានទីតាំង · The photo will be sent without a
                  location. Allow location and tap retry to add it.
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {documents.length > 0 && (
        <ul className='grid min-w-0 gap-2'>
          {documents.map((file) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}`}
              className='flex min-w-0 items-center gap-3 rounded-md border p-2'
            >
              <div className='flex size-12 shrink-0 items-center justify-center rounded bg-muted'>
                <FileText className='size-5 text-muted-foreground' />
              </div>
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-medium'>{file.name}</p>
                <p className='text-xs text-muted-foreground'>
                  {formatFileSize(file.size)}
                </p>
              </div>
              <WithTooltip label='លុប · Remove' disabled={disabled}>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  disabled={disabled}
                  onClick={() => {
                    setProblems([])
                    onDocumentsChange(documents.filter((f) => f !== file))
                  }}
                  aria-label={`Remove ${file.name}`}
                >
                  <X />
                </Button>
              </WithTooltip>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
