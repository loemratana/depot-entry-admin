import { useState } from 'react'
import { ExternalLink, FileText, ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { type SubmissionFile } from '../data/schema'
import { formatDateTime, formatFileSize } from '../lib/format'

type ImageState = 'loading' | 'loaded' | 'error'

function ImageThumbnail({
  file,
  onOpen,
}: {
  file: SubmissionFile
  onOpen: () => void
}) {
  const [state, setState] = useState<ImageState>(file.url ? 'loading' : 'error')
  const uploaded = formatDateTime(file.uploadedAt)

  return (
    <figure className='flex min-w-0 flex-col gap-1'>
      <button
        type='button'
        onClick={onOpen}
        disabled={state === 'error'}
        title={file.name}
        className='group relative aspect-square w-full overflow-hidden rounded-md border bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed'
      >
        {state === 'loading' && <Skeleton className='absolute inset-0' />}
        {state === 'error' ? (
          <span className='flex size-full flex-col items-center justify-center gap-1 p-2 text-xs text-muted-foreground'>
            <ImageOff className='size-5' />
            Unavailable
          </span>
        ) : (
          <img
            src={file.url ?? undefined}
            alt={file.name}
            loading='lazy'
            decoding='async'
            onLoad={() => setState('loaded')}
            onError={() => setState('error')}
            className={cn(
              'size-full object-contain transition-opacity group-hover:opacity-90',
              state === 'loading' && 'opacity-0'
            )}
          />
        )}
        <span className='sr-only'>Preview {file.name}</span>
      </button>
      {uploaded && (
        <figcaption className='truncate text-[11px] leading-tight text-muted-foreground'>
          <UploadTime file={file} label={uploaded} />
        </figcaption>
      )}
    </figure>
  )
}

/** Machine-readable <time> so the exact upload moment is available on hover */
function UploadTime({ file, label }: { file: SubmissionFile; label: string }) {
  return (
    <time dateTime={file.uploadedAt ?? undefined} title={`Uploaded ${label}`}>
      {label}
    </time>
  )
}

function FileRow({ file }: { file: SubmissionFile }) {
  const size = formatFileSize(file.size)
  const uploaded = formatDateTime(file.uploadedAt)
  return (
    <li className='flex items-center gap-3 rounded-md border px-3 py-2'>
      <FileText className='size-5 shrink-0 text-muted-foreground' />
      <div className='min-w-0 flex-1'>
        <p className='truncate text-sm font-medium' title={file.name}>
          {file.name}
        </p>
        {(size || uploaded) && (
          <p className='text-xs text-muted-foreground'>
            {size}
            {size && uploaded && ' · '}
            {uploaded && <UploadTime file={file} label={uploaded} />}
          </p>
        )}
      </div>
      {file.url ? (
        <Button variant='outline' size='sm' asChild>
          <a href={file.url} target='_blank' rel='noopener noreferrer'>
            View
            <span className='sr-only'> {file.name} (opens in a new tab)</span>
          </a>
        </Button>
      ) : (
        <Button variant='outline' size='sm' disabled>
          Unavailable
        </Button>
      )}
    </li>
  )
}

export function ClientDocuments({ files }: { files: SubmissionFile[] }) {
  const [preview, setPreview] = useState<SubmissionFile | null>(null)
  const images = files.filter((file) => file.kind === 'image')
  const documents = files.filter((file) => file.kind !== 'image')

  if (files.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>No documents uploaded.</p>
    )
  }

  return (
    <div className='flex flex-col gap-3'>
      {images.length > 0 && (
        <div className='grid grid-cols-3 gap-2'>
          {images.map((file) => (
            <ImageThumbnail
              // Presigned URLs change on refetch; restart loading state
              key={`${file.id}-${file.url}`}
              file={file}
              onOpen={() => setPreview(file)}
            />
          ))}
        </div>
      )}

      {documents.length > 0 && (
        <ul className='flex flex-col gap-2'>
          {documents.map((file) => (
            <FileRow key={file.id} file={file} />
          ))}
        </ul>
      )}

      <Dialog
        open={!!preview}
        onOpenChange={(open) => !open && setPreview(null)}
      >
        <DialogContent className='sm:max-w-3xl'>
          <DialogHeader>
            <DialogTitle className='truncate pe-6'>{preview?.name}</DialogTitle>
            <DialogDescription>
              {[
                formatFileSize(preview?.size ?? null),
                preview &&
                  formatDateTime(preview.uploadedAt) &&
                  `Uploaded ${formatDateTime(preview.uploadedAt)}`,
              ]
                .filter(Boolean)
                .join(' · ') || 'Image preview'}
            </DialogDescription>
          </DialogHeader>
          {preview?.url && (
            <>
              <div className='flex justify-center rounded-md bg-muted'>
                <img
                  src={preview.url}
                  alt={preview.name}
                  className='max-h-[70vh] w-auto max-w-full object-contain'
                />
              </div>
              <Button variant='outline' size='sm' className='self-end' asChild>
                <a href={preview.url} target='_blank' rel='noopener noreferrer'>
                  <ExternalLink />
                  Open original
                </a>
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
