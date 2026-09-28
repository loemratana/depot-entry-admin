import { AlertCircle, RotateCw } from 'lucide-react'
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
import { useSubmission } from '../data/queries'
import { type NamedLocation, type Submission } from '../data/schema'
import { formatPhone, formatSubmittedAt } from '../lib/format'
import { ClientDocuments } from './client-documents'

type ClientDetailSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Row from the table; shown immediately while the full record loads */
  submission: Submission | null
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className='flex flex-col gap-3'>
      <h3 className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
        {title}
      </h3>
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
}: ClientDetailSheetProps) {
  const detail = useSubmission(open ? (submission?.id ?? null) : null)
  const client = detail.data ?? submission
  const submitted = formatSubmittedAt(client?.submittedAt ?? null)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full gap-0 sm:max-w-md'>
        <SheetHeader className='border-b'>
          <SheetTitle>Client Details</SheetTitle>
          <SheetDescription className='sr-only'>
            Submitted client information
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-y-auto px-4 py-5'>
          {client ? (
            <div className='flex flex-col gap-5'>
              <Section title='Client information'>
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

              <Separator />

              <Section title='Sale GB'>
                <dl>
                  <Field label='Sale GB'>{client.saleGb?.name}</Field>
                </dl>
              </Section>

              <Separator />

              <Section title='Documents'>
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
                  <ClientDocuments files={detail.data.files} />
                )}
              </Section>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
