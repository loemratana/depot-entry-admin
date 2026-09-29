import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  ImagePlus,
  Loader2,
  MapPinOff,
  RotateCw,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { formatFileSize } from '@/features/clients/lib/format'
import {
  type FileProblem,
  MAX_FILES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  createIdempotencyKey,
  mergeFiles,
} from '../lib/files'
import {
  GPS_ERROR_MESSAGES,
  GpsError,
  type GpsErrorCode,
  type GpsReading,
  isLowAccuracy,
  readGps,
} from '../lib/geolocation'
import { SitePhotoDialog } from './site-photo-dialog'

/** One site photo with its own id and its own GPS reading */
export type SitePhoto = {
  /** Client-generated; the backend matches GPS to the photo by this id */
  photoId: string
  file: File
  status: 'locating' | 'ready' | 'failed'
  gps?: GpsReading
  error?: GpsErrorCode
}

const SITE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

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

function checkPhoto(file: File): string | null {
  if (!SITE_PHOTO_TYPES.includes(file.type))
    return 'ប្រភេទឯកសារមិនត្រូវបានអនុញ្ញាត · Only JPG, PNG, WebP or PDF'
  if (file.size === 0) return 'ឯកសារទទេ · File is empty'
  if (file.size > MAX_FILE_SIZE_BYTES)
    return `ធំជាង ${MAX_FILE_SIZE_MB}MB · Larger than ${MAX_FILE_SIZE_MB} MB`
  return null
}

function GpsStatus({ photo }: { photo: SitePhoto }) {
  if (photo.status === 'locating') {
    return (
      <p className='flex items-center gap-1.5 text-sm text-muted-foreground'>
        <Loader2 className='size-4 animate-spin' />
        កំពុងរកទីតាំង · Getting location...
      </p>
    )
  }
  if (photo.status === 'failed' || !photo.gps) {
    return (
      <p className='flex items-start gap-1.5 text-sm text-destructive'>
        <MapPinOff className='mt-0.5 size-4 shrink-0' />
        <span>{GPS_ERROR_MESSAGES[photo.error ?? 'unavailable']}</span>
      </p>
    )
  }
  const low = isLowAccuracy(photo.gps)
  return (
    <div className='grid gap-0.5 text-sm'>
      <p className='flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400'>
        <CheckCircle2 className='size-4' />
        GPS captured
      </p>
      <p
        className={cn(
          'flex items-center gap-1.5 text-muted-foreground',
          low && 'text-amber-700 dark:text-amber-400'
        )}
      >
        {low && <AlertTriangle className='size-4 shrink-0' />}
        Accuracy: ±{Math.round(photo.gps.accuracy)} m
        {low && ' · ភាពត្រឹមត្រូវទាប · Low accuracy'}
      </p>
      <p className='text-muted-foreground'>
        Captured: {format(new Date(photo.gps.capturedAt), 'd MMM yyyy, h:mm a')}
      </p>
    </div>
  )
}

/**
 * The form's single upload box. Clicking it offers Upload or Take photo
 * (in-page camera, which asks for camera permission). Photos get GPS right
 * after they are added (never on page load), each its own reading; PDFs are
 * kept as documents without GPS.
 */
export function SitePhotos({
  value,
  onUpdate,
  documents,
  onDocumentsChange,
  disabled,
  invalid,
}: SitePhotosProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const remaining = MAX_FILES - value.length - documents.length
  const locked = disabled || remaining <= 0
  const [problems, setProblems] = useState<FileProblem[]>([])
  const previews = usePreviews(value)

  const locate = (photoIds: string[]) => {
    const ids = new Set(photoIds)
    const set = (patch: Partial<SitePhoto>) =>
      onUpdate((photos) =>
        photos.map((p) => (ids.has(p.photoId) ? { ...p, ...patch } : p))
      )

    set({ status: 'locating', error: undefined })
    readGps().then(
      (gps) => set({ status: 'ready', gps, error: undefined }),
      (error: unknown) =>
        set({
          status: 'failed',
          gps: undefined,
          error: error instanceof GpsError ? error.code : 'unavailable',
        })
    )
  }

  const add = (picked: File[]) => {
    if (!picked.length) return
    const found: FileProblem[] = []
    const added: SitePhoto[] = []
    const isPdf = (file: File) => file.type === 'application/pdf'
    for (const file of picked.filter((file) => !isPdf(file))) {
      const reason = checkPhoto(file)
      if (reason) found.push({ name: file.name, reason })
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
    // Photos taken together share one fresh reading; each still stores its own copy
    locate(added.map((p) => p.photoId))
  }

  const remove = (photoId: string) => {
    setProblems([])
    onUpdate((photos) => photos.filter((p) => p.photoId !== photoId))
  }

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
        onClick={() => !locked && setDialogOpen(true)}
        onKeyDown={(e) => {
          if (!locked && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            setDialogOpen(true)
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
      <SitePhotoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onFiles={add}
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
        <ul className='grid min-w-0 gap-3'>
          {value.map((photo) => (
            <li
              key={photo.photoId}
              className='flex min-w-0 flex-col gap-3 rounded-md border p-3 sm:flex-row'
            >
              <img
                src={previews.get(photo.file)}
                alt='Site photo'
                className='aspect-4/3 w-full shrink-0 rounded bg-muted object-cover sm:w-36'
              />
              <div className='flex min-w-0 flex-1 flex-col justify-between gap-2'>
                <GpsStatus photo={photo} />
                <div className='flex flex-wrap gap-2'>
                  {(photo.status === 'failed' ||
                    (photo.gps && isLowAccuracy(photo.gps))) && (
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      disabled={disabled}
                      onClick={() => locate([photo.photoId])}
                    >
                      <RotateCw />
                      Retry location
                    </Button>
                  )}
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    disabled={disabled}
                    onClick={() => remove(photo.photoId)}
                  >
                    <X />
                    Remove
                  </Button>
                </div>
              </div>
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
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
