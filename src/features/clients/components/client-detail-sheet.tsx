import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  AlertCircle,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RotateCw,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  ACCEPT_ATTRIBUTE,
  MAX_FILES,
  mergeFiles,
} from '@/features/submit/lib/files'
import {
  useAddClientFiles,
  useRemoveClientFile,
  useSubmission,
} from '../data/queries'
import {
  type NamedLocation,
  type Submission,
  type SubmissionFile,
} from '../data/schema'
import { formatDateTime, formatPhone, formatSubmittedAt } from '../lib/format'
import { ClientDocuments } from './client-documents'

type ClientDetailSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Row from the table; shown immediately while the full record loads */
  submission: Submission | null
  /** Omit to hide the Edit / Delete buttons (e.g. on the map) */
  onEdit?: (client: Submission) => void
  onDelete?: (client: Submission) => void
}

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className='flex flex-col gap-3'>
      <div className='flex min-h-8 items-center justify-between gap-2'>
        <h3 className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className='grid grid-cols-[7.5rem_1fr] items-baseline gap-3 text-sm'>
      <dt className='text-muted-foreground'>{label}</dt>
      <dd className={cn('min-w-0 leading-relaxed wrap-break-word', className)}>
        {children || <span className='text-muted-foreground'>—</span>}
      </dd>
    </div>
  )
}

/** Site photos with GPS: coordinates, accuracy, capture time and a link to the map */
function PhotoLocations({
  submissionId,
  files,
  onNavigate,
}: {
  submissionId: string
  files: SubmissionFile[]
  /** Closes the sheet so the map is visible (it may already be the current page) */
  onNavigate: () => void
}) {
  const geotagged = files.filter((file) => file.gps)
  if (geotagged.length === 0) return null
  return (
    <>
      <Separator />
      <Section title='Site photo GPS'>
        <ul className='flex flex-col gap-2'>
          {geotagged.map((file, index) => {
            const gps = file.gps!
            const captured = formatDateTime(gps.capturedAt)
            return (
              <li
                key={file.id}
                className='flex items-start gap-3 rounded-md border px-3 py-2 text-sm'
              >
                <MapPin className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
                <div className='min-w-0 flex-1'>
                  <p className='font-medium'>
                    Photo {index + 1}{' '}
                    <span className='ms-1.5 font-normal text-muted-foreground tabular-nums'>
                      {gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)}
                    </span>
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {gps.accuracy != null &&
                      `Accuracy ±${Math.round(gps.accuracy)} m`}
                    {gps.accuracy != null && captured && ' · '}
                    {captured && `Captured ${captured}`}
                  </p>
                </div>
                <Button variant='outline' size='sm' asChild>
                  <Link
                    to='/client-map'
                    search={{ submissionId, photoId: file.id }}
                    onClick={onNavigate}
                  >
                    View on map
                  </Link>
                </Button>
              </li>
            )
          })}
        </ul>
      </Section>
    </>
  )
}

function LocationValue({ location }: { location: NamedLocation | null }) {
  if (!location) return null
  const primary = location.nameEn || location.nameKh
  const secondary = location.nameEn && location.nameKh ? location.nameKh : ''
  return (
    <>
      <span>{primary}</span>
      {secondary && (
        <span className='block text-muted-foreground'>{secondary}</span>
      )}
    </>
  )
}

export function ClientDetailSheet({
  open,
  onOpenChange,
  submission,
  onEdit,
  onDelete,
}: ClientDetailSheetProps) {
  const detail = useSubmission(open ? (submission?.id ?? null) : null)
  const client = detail.data ?? submission
  const submitted = formatSubmittedAt(client?.submittedAt ?? null)

  const fileInput = useRef<HTMLInputElement>(null)
  const [toRemove, setToRemove] = useState<SubmissionFile | null>(null)
  const addFiles = useAddClientFiles()
  const removeFile = useRemoveClientFile()
  const fileCount = detail.data?.files.length ?? 0

  const upload = (picked: FileList | null) => {
    if (!client || !picked?.length) return
    // Same type/size checks as the client form; the backend re-checks contents
    const { files, problems } = mergeFiles([], Array.from(picked))
    for (const problem of problems)
      toast.error(`${problem.name}: ${problem.reason}`)
    if (!files.length) return
    addFiles.mutate(
      { id: client.id, files },
      {
        onSuccess: () =>
          toast.success(
            `${files.length} file${files.length === 1 ? '' : 's'} added`
          ),
      }
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full gap-0 sm:max-w-md'>
        <SheetHeader className='border-b'>
          <SheetTitle>Outlet Details</SheetTitle>
          {client && (onEdit || onDelete) && (
            <div className='flex gap-2 pt-1'>
              {onEdit && (
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => onEdit(client)}
                >
                  <Pencil /> Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  size='sm'
                  variant='outline'
                  className='text-destructive hover:text-destructive'
                  onClick={() => onDelete(client)}
                >
                  <Trash2 /> Delete
                </Button>
              )}
            </div>
          )}
          <SheetDescription className='sr-only'>
            Submitted outlet information
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-y-auto px-4 py-5'>
          {client ? (
            <div className='flex flex-col gap-5'>
              <Section title='Outlet information'>
                <dl className='flex flex-col gap-2.5'>
                  <Field label='Name' className='font-medium'>
                    {client.clientName}
                  </Field>
                  <Field label='Phone' className='tabular-nums'>
                    {client.phone && (
                      <a
                        href={`tel:${client.phone.replace(/[^\d+]/g, '')}`}
                        className='hover:underline'
                      >
                        {formatPhone(client.phone)}
                      </a>
                    )}
                  </Field>
                  <Field label='Submitted'>
                    {submitted && `${submitted.date} · ${submitted.time}`}
                  </Field>
                </dl>
              </Section>

              <Separator />

              <Section title='Location'>
                <dl className='flex flex-col gap-2.5'>
                  <Field label='Province'>
                    <LocationValue location={client.province} />
                  </Field>
                  <Field label='District'>
                    <LocationValue location={client.district} />
                  </Field>
                  <Field label='Commune'>
                    <LocationValue location={client.commune} />
                  </Field>
                </dl>
              </Section>

              {detail.data && (
                <PhotoLocations
                  submissionId={detail.data.id}
                  files={detail.data.files}
                  onNavigate={() => onOpenChange(false)}
                />
              )}

              <Separator />

              <Section title='Sale GB'>
                <dl>
                  <Field label='Sale GB'>{client.saleGb?.name}</Field>
                </dl>
              </Section>

              <Separator />

              <Section
                title='Documents'
                action={
                  detail.data && (
                    <>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => fileInput.current?.click()}
                        disabled={addFiles.isPending || fileCount >= MAX_FILES}
                        title={
                          fileCount >= MAX_FILES
                            ? `An outlet can have at most ${MAX_FILES} files`
                            : undefined
                        }
                      >
                        {addFiles.isPending ? (
                          <Loader2 className='animate-spin' />
                        ) : (
                          <Plus />
                        )}
                        Add files
                      </Button>
                      <input
                        ref={fileInput}
                        type='file'
                        multiple
                        accept={ACCEPT_ATTRIBUTE}
                        className='sr-only'
                        tabIndex={-1}
                        onChange={(e) => {
                          upload(e.target.files)
                          e.target.value = ''
                        }}
                      />
                    </>
                  )
                }
              >
                {detail.isPending ? (
                  <div className='grid grid-cols-3 gap-2'>
                    {Array.from({ length: 3 }, (_, index) => (
                      <Skeleton key={index} className='aspect-square' />
                    ))}
                  </div>
                ) : detail.isError ? (
                  <div className='flex flex-col items-start gap-2 rounded-md border border-dashed p-3 text-sm'>
                    <p className='flex items-center gap-2 font-medium'>
                      <AlertCircle className='size-4 text-destructive' />
                      Unable to load client details.
                    </p>
                    <p className='text-muted-foreground'>
                      {getErrorMessage(detail.error, 'Please try again.')}
                    </p>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => detail.refetch()}
                      disabled={detail.isFetching}
                    >
                      <RotateCw
                        className={cn(detail.isFetching && 'animate-spin')}
                      />
                      Retry
                    </Button>
                  </div>
                ) : (
                  <ClientDocuments
                    files={detail.data.files}
                    // The last file cannot be removed: a client needs at least one
                    onRemove={fileCount > 1 ? setToRemove : undefined}
                  />
                )}
              </Section>
            </div>
          ) : null}
        </div>
      </SheetContent>

      <ConfirmDialog
        open={!!toRemove}
        onOpenChange={(isOpen) =>
          !isOpen && !removeFile.isPending && setToRemove(null)
        }
        title={`Remove "${toRemove?.name}"?`}
        desc='The file is deleted from storage. This cannot be undone.'
        confirmText='Remove'
        destructive
        isLoading={removeFile.isPending}
        handleConfirm={() =>
          client &&
          toRemove &&
          removeFile.mutate(
            { id: client.id, fileId: toRemove.id },
            {
              onSuccess: () => toast.success('File removed'),
              onSettled: () => setToRemove(null),
            }
          )
        }
      />
    </Sheet>
  )
}
