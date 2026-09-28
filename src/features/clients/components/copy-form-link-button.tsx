import { Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

/** Copies the public client entry form URL so admins can send it to clients */
export function CopyFormLinkButton() {
  const copy = async () => {
    const url = `${window.location.origin}/submit`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Client form link copied', { description: url })
    } catch {
      // Clipboard API is unavailable over plain http on non-localhost addresses
      toast.info('Client form link', { description: url, duration: 15000 })
    }
  }

  return (
    <Button variant='outline' onClick={copy}>
      <Link2 />
      Copy form link
    </Button>
  )
}
