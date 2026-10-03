import { useEffect, useMemo, useRef, useState } from 'react'
import { FileText, ImagePlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { WithTooltip } from '@/components/with-tooltip'
import { formatFileSize } from '@/features/clients/lib/format'
import {
  ACCEPT_ATTRIBUTE,
  type FileProblem,
  MAX_FILES,
  MAX_FILE_SIZE_MB,
  mergeFiles,
} from '../lib/files'

type FilePickerProps = {
  id?: string
  value: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
  invalid?: boolean
  /** Defaults to MAX_FILES; lower when site photos use part of the allowance */
  maxFiles?: number
}

/** Object URLs for image previews, revoked when files are removed or on unmount */
function usePreviews(files: File[]) {
  const previews = useMemo(
    () =>
      new Map(
        files
          .filter((file) => file.type.startsWith('image/'))
          .map((file) => [file, URL.createObjectURL(file)])
      ),
    [files]
  )
  useEffect(
    () => () => previews.forEach((url) => URL.revokeObjectURL(url)),
    [previews]
  )
  return previews
}

export function FilePicker({
  id,
  value,
  onChange,
  disabled,
  invalid,
  maxFiles = MAX_FILES,
}: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [problems, setProblems] = useState<FileProblem[]>([])
  const previews = usePreviews(value)

  const add = (picked: FileList | null) => {
    if (!picked?.length) return
    const result = mergeFiles(value, Array.from(picked), maxFiles)
    setProblems(result.problems)
    onChange(result.files)
  }

  const remove = (file: File) => {
    setProblems([])
    onChange(value.filter((f) => f !== file))
  }

  return (
    <div className='grid min-w-0 gap-3'>
      <div
        role='button'
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-invalid={invalid}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!disabled) add(e.dataTransfer.files)
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed px-4 py-6 text-center transition-colors outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50',
          dragging && 'border-primary bg-muted/50',
          invalid && 'border-destructive',
          disabled && 'pointer-events-none opacity-50'
        )}
      >
        <ImagePlus className='mb-1 size-6 text-muted-foreground' />
        <span className='text-sm font-medium'>ជ្រើសរើសរូបភាព ឬឯកសារ</span>
        <span className='text-sm text-muted-foreground'>
          Choose photos or files
        </span>
        <span className='text-xs text-muted-foreground'>
          JPG, PNG, WebP, PDF · ≤ {MAX_FILE_SIZE_MB} MB · max {MAX_FILES}
        </span>
        <input
          ref={inputRef}
          id={id}
          type='file'
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className='sr-only'
          tabIndex={-1}
          disabled={disabled}
          onChange={(e) => {
            add(e.target.files)
            // Allow picking the same file again after removing it
            e.target.value = ''
          }}
        />
      </div>

      {problems.length > 0 && (
        <ul className='grid gap-1 text-sm text-destructive'>
          {problems.map((problem) => (
            <li key={problem.name} className='break-words'>
              {problem.name}: {problem.reason}
            </li>
          ))}
        </ul>
      )}

      {value.length > 0 && (
        <ul className='grid min-w-0 gap-2'>
          {value.map((file) => {
            const preview = previews.get(file)
            return (
              <li
                key={`${file.name}-${file.size}-${file.lastModified}`}
                className='flex min-w-0 items-center gap-3 rounded-md border p-2'
              >
                <div className='flex size-12 shrink-0 items-center justify-center overflow-hidden rounded bg-muted'>
                  {preview ? (
                    <img
                      src={preview}
                      alt=''
                      className='size-full object-cover'
                    />
                  ) : (
                    <FileText className='size-5 text-muted-foreground' />
                  )}
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
                    onClick={() => remove(file)}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X />
                  </Button>
                </WithTooltip>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
