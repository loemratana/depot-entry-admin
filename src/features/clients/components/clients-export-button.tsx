import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useExportSubmissions } from '../data/queries'
import { type ClientFilters } from '../data/schema'

export function ClientsExportButton({ filters }: { filters: ClientFilters }) {
  const exportMutation = useExportSubmissions()
  const isExporting = exportMutation.isPending

  return (
    <Button
      variant='outline'
      onClick={() => exportMutation.mutate(filters)}
      disabled={isExporting}
      aria-busy={isExporting}
    >
      {isExporting ? <Loader2 className='animate-spin' /> : <Download />}
      {isExporting ? 'Exporting...' : 'Export Excel'}
    </Button>
  )
}
