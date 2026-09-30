import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  House,
  Loader2,
  Map,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { WithTooltip } from '@/components/with-tooltip'
import { getFieldErrors } from '@/features/submit/data/api'
import { ImportReportView } from './components/import-report'
import { LocationsTable } from './components/locations-table'
import {
  type ImportReport,
  downloadLocationTemplate,
  getLocationSummary,
  uploadLocations,
} from './data/api'

const MAX_BYTES = 5 * 1024 * 1024
const summaryKey = ['locations', 'summary'] as const

function SummaryStrip() {
  const { data, isLoading, isError } = useQuery({
    queryKey: summaryKey,
    queryFn: getLocationSummary,
  })

  const items = [
    {
      label: 'Provinces',
      kh: 'ខេត្ត/ក្រុង',
      icon: Map,
      iconBg: 'bg-[#5027F5]',
      count: data?.provinces,
    },
    {
      label: 'Districts',
      kh: 'ខណ្ឌ/ស្រុក',
      icon: Building2,
      iconBg: 'bg-sky-600',
      count: data?.districts,
    },
    {
      label: 'Communes',
      kh: 'ឃុំ/ភូមិ',
      icon: House,
      iconBg: 'bg-emerald-600',
      count: data?.communes,
    },
  ]

  return (
    <div className='grid gap-4 sm:grid-cols-3'>
      {items.map(({ label, kh, icon: Icon, iconBg, count }) => (
        // Whole card in the solid colour, white text
        <Card
          key={label}
          className={cn('gap-0 border-0 py-0 text-white shadow-sm', iconBg)}
        >
          <CardContent className='flex items-start justify-between gap-4 p-6'>
            <div className='grid gap-1'>
              <span className='text-sm font-medium text-white/85'>
                {label} · {kh}
              </span>
              {isLoading ? (
                <Skeleton className='my-1 h-10 w-24 bg-white/25' />
              ) : (
                <span className='text-4xl font-bold tracking-tight tabular-nums'>
                  {isError ? '—' : (count?.total ?? 0).toLocaleString()}
                </span>
              )}
              <span className='text-xs text-white/80'>
                {count
                  ? `${count.active.toLocaleString()} active · ${(count.total - count.active).toLocaleString()} inactive`
                  : ' '}
              </span>
            </div>
            <div className='flex size-12 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white'>
              <Icon className='size-6' />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function totalChanges(report: ImportReport) {
  const { provinces, districts, communes } = report.result
  return [provinces, districts, communes].reduce(
    (sum, level) => sum + level.created + level.updated,
    0
  )
}

export function Locations() {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [imported, setImported] = useState<ImportReport | null>(null)

  const check = useMutation({
    mutationFn: (f: File) => uploadLocations(f, true),
    onError: () => {},
  })

  const runImport = useMutation({
    mutationFn: (f: File) => uploadLocations(f, false),
    onSuccess: (report) => {
      setImported(report)
      setFile(null)
      check.reset()
      // Refresh the counts and every location dropdown (filters and public form)
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Locations imported')
    },
    onError: () => {},
  })

  const template = useMutation({
    mutationFn: downloadLocationTemplate,
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'location-template.xlsx'
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Unable to download the template.')),
  })

  const choose = (picked: File | undefined) => {
    if (!picked) return
    setImported(null)
    runImport.reset()
    if (!/\.xlsx$/i.test(picked.name)) {
      toast.error('Please choose an Excel .xlsx file')
      return
    }
    if (picked.size > MAX_BYTES) {
      toast.error('The file is larger than 5 MB')
      return
    }
    setFile(picked)
    // Checking is safe (nothing is saved), so run it straight away
    check.mutate(picked)
  }

  const clear = () => {
    setFile(null)
    check.reset()
    runImport.reset()
  }

  const report = check.data
  const changes = report ? totalChanges(report) : 0
  const busy = check.isPending || runImport.isPending
  const error = check.error ?? runImport.error

  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center gap-2'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Locations</h2>
            <p className='text-muted-foreground'>
              Upload the province, district and commune list used by the forms
            </p>
          </div>
          <Button
            variant='outline'
            onClick={() => template.mutate()}
            disabled={template.isPending}
          >
            {template.isPending ? (
              <Loader2 className='animate-spin' />
            ) : (
              <Download />
            )}
            Download template
          </Button>
        </div>

        <SummaryStrip />

        <Tabs defaultValue='browse' className='gap-4'>
          <TabsList>
            <TabsTrigger value='browse'>All locations</TabsTrigger>
            <TabsTrigger value='upload'>Upload</TabsTrigger>
          </TabsList>
          <TabsContent value='browse'>
            <LocationsTable />
          </TabsContent>
          <TabsContent value='upload' className='grid gap-4'>
            {imported && (
              <Alert>
                <CheckCircle2 className='text-green-600' />
                <AlertTitle>Import finished: {imported.fileName}</AlertTitle>
                <AlertDescription>
                  Added {imported.result.provinces.created} provinces,{' '}
                  {imported.result.districts.created} districts and{' '}
                  {imported.result.communes.created} communes. Existing names
                  were kept unchanged, so nothing was duplicated.
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle className='text-base'>Upload Excel file</CardTitle>
                <CardDescription>
                  Columns: ខេត្ត/ក្រុង · ខណ្ឌ/ស្រុក · ឃុំ/ភូមិ. The file is
                  checked first; nothing is saved until you click Import. Names
                  that already exist (ignoring spaces and the ដ/ត subscript
                  spelling) are never added twice.
                </CardDescription>
              </CardHeader>
              <CardContent className='grid gap-6 *:min-w-0'>
                {!file ? (
                  <div
                    role='button'
                    tabIndex={0}
                    onClick={() => inputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        inputRef.current?.click()
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragging(true)
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragging(false)
                      choose(e.dataTransfer.files[0])
                    }}
                    className={cn(
                      'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed px-4 py-10 text-center transition-colors outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50',
                      dragging && 'border-primary bg-muted/50'
                    )}
                  >
                    <Upload className='mb-1 size-6 text-muted-foreground' />
                    <span className='text-sm font-medium'>
                      Drop an .xlsx file here or click to choose
                    </span>
                    <span className='text-xs text-muted-foreground'>
                      Maximum 5 MB
                    </span>
                    <input
                      ref={inputRef}
                      type='file'
                      accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                      className='sr-only'
                      tabIndex={-1}
                      onChange={(e) => {
                        choose(e.target.files?.[0])
                        e.target.value = ''
                      }}
                    />
                  </div>
                ) : (
                  <div className='flex items-center gap-3 rounded-md border p-3'>
                    <FileSpreadsheet className='size-8 shrink-0 text-green-700' />
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-sm font-medium'>
                        {file.name}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {check.isPending
                          ? 'Checking...'
                          : runImport.isPending
                            ? 'Importing...'
                            : report
                              ? 'Checked · nothing saved yet'
                              : ''}
                      </p>
                    </div>
                    <WithTooltip label='Remove file' disabled={busy}>
                      <Button
                        size='icon'
                        className='size-8 bg-red-600 text-white hover:bg-red-700'
                        onClick={clear}
                        disabled={busy}
                        aria-label='Remove file'
                      >
                        <X />
                      </Button>
                    </WithTooltip>
                  </div>
                )}

                {check.isPending && (
                  <div className='grid gap-2'>
                    <Skeleton className='h-40 w-full' />
                  </div>
                )}

                {error && (
                  <Alert variant='destructive'>
                    <AlertDescription>
                      {getErrorMessage(error, 'Unable to process the file.')}
                      {getFieldErrors(error).map((e) => (
                        <span key={e.message} className='block'>
                          {e.message}
                        </span>
                      ))}
                    </AlertDescription>
                  </Alert>
                )}

                {report && file && (
                  <>
                    {changes === 0 && (
                      // A re-upload of an imported file changes nothing; say so plainly
                      <Alert>
                        <CheckCircle2 className='text-green-600' />
                        <AlertTitle>
                          Everything in this file is already saved
                        </AlertTitle>
                        <AlertDescription>
                          All {report.inFile.provinces.toLocaleString()}{' '}
                          provinces, {report.inFile.districts.toLocaleString()}{' '}
                          districts and{' '}
                          {report.inFile.communes.toLocaleString()} communes
                          from {report.fileName} already exist, so there is
                          nothing new to import.
                          {report.invalid.total > 0 &&
                            ` ${report.invalid.total} row(s) below could not be read; fix them in Excel and upload again.`}
                        </AlertDescription>
                      </Alert>
                    )}
                    <ImportReportView report={report} />
                    <div className='flex flex-wrap items-center justify-end gap-2'>
                      <Button variant='outline' onClick={clear} disabled={busy}>
                        Choose another file
                      </Button>
                      <Button
                        onClick={() => runImport.mutate(file)}
                        disabled={busy || changes === 0}
                      >
                        {runImport.isPending ? (
                          <Loader2 className='animate-spin' />
                        ) : (
                          <Upload />
                        )}
                        {changes === 0
                          ? 'Nothing new to import'
                          : `Import ${changes.toLocaleString()} change${changes === 1 ? '' : 's'}`}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
