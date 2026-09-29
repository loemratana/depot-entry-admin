import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, ImageUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type CameraErrorCode =
  | 'insecure'
  | 'unsupported'
  | 'denied'
  | 'notFound'
  | 'busy'

const CAMERA_ERROR_MESSAGES: Record<CameraErrorCode, string> = {
  insecure:
    'កាមេរ៉ាត្រូវការ HTTPS · The camera needs a secure (https) link to this form',
  unsupported:
    'កម្មវិធីរុករកនេះមិនអាចបើកកាមេរ៉ាបានទេ · This browser cannot open the camera',
  denied:
    'មិនមានការអនុញ្ញាតកាមេរ៉ា · Camera permission was denied. Allow it in the browser settings and try again',
  notFound: 'រកមិនឃើញកាមេរ៉ា · No camera was found on this device',
  busy: 'កាមេរ៉ាកំពុងប្រើដោយកម្មវិធីផ្សេង · The camera is being used by another app',
}

/** Problems known before asking for the camera */
function cameraSupportError(): CameraErrorCode | null {
  if (!window.isSecureContext) return 'insecure'
  if (!navigator.mediaDevices?.getUserMedia) return 'unsupported'
  return null
}

function toCameraError(error: unknown): CameraErrorCode {
  // By name: some browsers reject with non-DOMException errors (e.g. OverconstrainedError)
  const name =
    error && typeof error === 'object' && 'name' in error
      ? String(error.name)
      : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return 'notFound'
  if (name === 'NotReadableError' || name === 'AbortError') return 'busy'
  return 'unsupported'
}

/**
 * Live camera inside the page. The browser asks for camera permission when
 * this opens; the rear camera is preferred. The stream stops on close.
 */
function CameraView({
  onCapture,
  onUploadInstead,
}: {
  onCapture: (file: File) => void
  onUploadInstead: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<CameraErrorCode | null>(cameraSupportError)
  const [live, setLive] = useState(false)
  const [capturing, setCapturing] = useState(false)

  useEffect(() => {
    if (cameraSupportError()) return
    let stream: MediaStream | null = null
    let cancelled = false

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      .then(async (media) => {
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop())
          return
        }
        stream = media
        const video = videoRef.current
        if (!video) return
        video.srcObject = media
        await video.play().catch(() => {})
        setLive(true)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(toCameraError(e))
      })

    return () => {
      cancelled = true
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const capture = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    setCapturing(true)
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        setCapturing(false)
        if (!blob) return
        const now = Date.now()
        onCapture(
          new File([blob], `site-photo-${now}.jpg`, {
            type: 'image/jpeg',
            lastModified: now,
          })
        )
      },
      'image/jpeg',
      0.9
    )
  }

  if (error) {
    return (
      <div className='grid gap-4'>
        <div className='flex flex-col items-center gap-2 rounded-md border border-dashed px-4 py-8 text-center text-sm'>
          <CameraOff className='size-6 text-muted-foreground' />
          <p>{CAMERA_ERROR_MESSAGES[error]}</p>
        </div>
        <Button type='button' variant='outline' onClick={onUploadInstead}>
          <ImageUp />
          ផ្ទុករូបភាពជំនួសវិញ · Upload a photo instead
        </Button>
      </div>
    )
  }

  return (
    <div className='grid gap-4'>
      <div className='relative aspect-3/4 overflow-hidden rounded-md bg-black sm:aspect-video'>
        <video
          ref={videoRef}
          playsInline
          muted
          className='size-full object-cover'
          aria-label='Camera preview'
        />
        {!live && (
          <div className='absolute inset-0 flex items-center justify-center gap-2 text-sm text-white/80'>
            <Loader2 className='size-4 animate-spin' />
            កំពុងបើកកាមេរ៉ា · Opening camera...
          </div>
        )}
      </div>
      <Button
        type='button'
        size='lg'
        onClick={capture}
        disabled={!live || capturing}
      >
        {capturing ? <Loader2 className='animate-spin' /> : <Camera />}
        ថត · Capture
      </Button>
    </div>
  )
}

type SitePhotoDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Uploaded files (photos or PDF) or the captured photo; GPS is taken afterwards by the caller */
  onFiles: (files: File[]) => void
}

/** Choose Upload (photos or PDF) or Take photo (in-page camera) */
export function SitePhotoDialog({
  open,
  onOpenChange,
  onFiles,
}: SitePhotoDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [view, setView] = useState<'choose' | 'camera'>('choose')

  const close = () => onOpenChange(false)
  const upload = () => inputRef.current?.click()

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        // Start from the choice next time; closing also stops the camera
        if (!next) setView('choose')
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            {view === 'camera'
              ? 'ថតរូប · Take photo'
              : 'ថតរូប ឬជ្រើសរើសឯកសារ · Take a photo or choose files'}
          </DialogTitle>
          <DialogDescription>
            {view === 'camera'
              ? 'សូមអនុញ្ញាតកាមេរ៉ា · Allow camera access when the browser asks'
              : 'ជ្រើសរើសវិធី · Choose how to add the photo'}
          </DialogDescription>
        </DialogHeader>

        {view === 'choose' ? (
          <div className='grid gap-3 sm:grid-cols-2'>
            <Button
              type='button'
              variant='outline'
              className='h-auto flex-col gap-2 py-6'
              onClick={upload}
            >
              <ImageUp className='size-6' />
              <span>ផ្ទុកឡើង · Upload</span>
              <span className='text-xs font-normal text-muted-foreground'>
                រូបភាព ឬ PDF · Photos or PDF
              </span>
            </Button>
            <Button
              type='button'
              variant='outline'
              className='h-auto flex-col gap-2 py-6'
              onClick={() => setView('camera')}
            >
              <Camera className='size-6' />
              <span>ថតរូប · Take photo</span>
              <span className='text-xs font-normal text-muted-foreground'>
                បើកកាមេរ៉ា · Open the camera
              </span>
            </Button>
          </div>
        ) : (
          <CameraView
            onCapture={(file) => {
              onFiles([file])
              close()
              setView('choose')
            }}
            onUploadInstead={upload}
          />
        )}

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
            if (!files.length) return
            onFiles(files)
            close()
            setView('choose')
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
