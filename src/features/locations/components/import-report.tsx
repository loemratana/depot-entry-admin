import { AlertTriangle, CopyX, FileWarning } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type ImportReport, type LevelResult } from '../data/api'

const LEVELS = [
  { key: 'provinces', label: 'Provinces', kh: 'ខេត្ត/ក្រុង' },
  { key: 'districts', label: 'Districts', kh: 'ខណ្ឌ/ស្រុក' },
  { key: 'communes', label: 'Communes', kh: 'ឃុំ/ភូមិ' },
] as const

const LEVEL_LABEL = {
  province: 'Province',
  district: 'District',
  commune: 'Commune',
} as const

function Section({
  icon: Icon,
  title,
  total,
  shown,
  children,
}: {
  icon: React.ElementType
  title: string
  total: number
  shown: number
  children: React.ReactNode
}) {
  return (
    <section className='grid gap-2'>
      <h3 className='flex items-center gap-2 text-sm font-medium'>
        <Icon className='size-4 text-muted-foreground' />
        {title}
        <Badge variant='secondary'>{total}</Badge>
      </h3>
      <div className='max-h-72 overflow-auto rounded-md border'>{children}</div>
      {total > shown && (
        <p className='text-xs text-muted-foreground'>
          Showing the first {shown} of {total}.
        </p>
      )}
    </section>
  )
}

function Count({ value, tone }: { value: number; tone?: 'new' | 'muted' }) {
  if (!value) return <span className='text-muted-foreground'>0</span>
  return (
    <span
      className={
        tone === 'new'
          ? 'font-semibold text-green-700 dark:text-green-500'
          : undefined
      }
    >
      {value.toLocaleString()}
    </span>
  )
}

export function ImportReportView({ report }: { report: ImportReport }) {
  const rowOf = (level: (typeof LEVELS)[number]['key']): LevelResult =>
    report.result[level]

  return (
    <div className='grid gap-6'>
      <div className='overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Level</TableHead>
              <TableHead className='text-end'>In file</TableHead>
              <TableHead className='text-end'>
                {report.dryRun ? 'Will be added' : 'Added'}
              </TableHead>
              <TableHead className='text-end'>
                {report.dryRun ? 'Will be updated' : 'Updated'}
              </TableHead>
              <TableHead className='text-end'>Already exist</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {LEVELS.map((level) => {
              const result = rowOf(level.key)
              return (
                <TableRow key={level.key}>
                  <TableCell>
                    <div className='font-medium'>{level.label}</div>
                    <div className='text-xs text-muted-foreground'>
                      {level.kh}
                    </div>
                  </TableCell>
                  <TableCell className='text-end'>
                    {report.inFile[level.key].toLocaleString()}
                  </TableCell>
                  <TableCell className='text-end'>
                    <Count value={result.created} tone='new' />
                  </TableCell>
                  <TableCell className='text-end'>
                    <Count value={result.updated} />
                  </TableCell>
                  <TableCell className='text-end'>
                    <Count value={result.unchanged} />
                    {result.matchedByName > 0 && (
                      <div className='text-xs text-muted-foreground'>
                        {result.matchedByName} matched by name
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <p className='text-sm text-muted-foreground'>
        {report.rows.read.toLocaleString()} rows read from{' '}
        {report.sheets.map((s) => `"${s.name}"`).join(', ')}
        {report.rows.inheritedParent > 0 &&
          ` · ${report.rows.inheritedParent} ${report.rows.inheritedParent === 1 ? 'row' : 'rows'} used the province/district from the row above`}
        {report.skippedSheets.length > 0 &&
          ` · skipped sheets without the expected headers: ${report.skippedSheets.join(', ')}`}
      </p>

      {report.duplicates.total > 0 && (
        <Section
          icon={CopyX}
          title='Duplicate names merged (first spelling kept)'
          total={report.duplicates.total}
          shown={report.duplicates.items.length}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-20'>Row</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Name in this row</TableHead>
                <TableHead>Same as</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.duplicates.items.map((d) => (
                <TableRow key={`${d.sheet}-${d.row}-${d.level}`}>
                  <TableCell>{d.row}</TableCell>
                  <TableCell>{LEVEL_LABEL[d.level]}</TableCell>
                  <TableCell>{d.name}</TableCell>
                  <TableCell>
                    {d.duplicateOf}{' '}
                    <span className='text-xs text-muted-foreground'>
                      (row {d.firstRow})
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}

      {report.invalid.total > 0 && (
        <Section
          icon={FileWarning}
          title='Rows that will be skipped'
          total={report.invalid.total}
          shown={report.invalid.items.length}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-20'>Row</TableHead>
                <TableHead>Problem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.invalid.items.map((r) => (
                <TableRow key={`${r.sheet}-${r.row}-${r.reason}`}>
                  <TableCell>{r.row}</TableCell>
                  <TableCell className='whitespace-normal'>
                    {r.reason}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}

      {report.warnings.total > 0 && (
        <Section
          icon={AlertTriangle}
          title='Warnings'
          total={report.warnings.total}
          shown={report.warnings.items.length}
        >
          <Table>
            <TableBody>
              {report.warnings.items.map((r) => (
                <TableRow key={`${r.sheet}-${r.row}-${r.reason}`}>
                  <TableCell className='w-20'>{r.row}</TableCell>
                  <TableCell className='whitespace-normal'>
                    {r.reason}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}
    </div>
  )
}
