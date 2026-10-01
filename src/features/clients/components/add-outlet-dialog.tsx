import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { OutletEntry } from '@/features/submit/components/outlet-entry'

type AddOutletDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * "Add outlet" in the admin: the same multi-step form as the public /submit
 * page (location, site photos with GPS, stock per brand), sent as this admin.
 */
export function AddOutletDialog({ open, onOpenChange }: AddOutletDialogProps) {
  const queryClient = useQueryClient()
  // A fresh form (and idempotency key) every time the dialog opens
  const [formKey, setFormKey] = useState(0)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setFormKey((key) => key + 1)
        onOpenChange(next)
      }}
    >
      <DialogContent className='max-h-[92svh] gap-0 overflow-y-auto p-0 sm:max-w-xl'>
        <DialogTitle className='sr-only'>Add outlet</DialogTitle>
        <DialogDescription className='sr-only'>
          The same outlet form as the public link
        </DialogDescription>
        <Card className='border-0 shadow-none'>
          <OutletEntry
            key={formKey}
            endpoint='/admin/submissions'
            onSuccess={({ submissionNo }) => {
              toast.success(`Outlet added (${submissionNo})`)
              queryClient.invalidateQueries({ queryKey: ['clients'] })
              queryClient.invalidateQueries({ queryKey: ['stock', 'reports'] })
              queryClient.invalidateQueries({ queryKey: ['locations'] })
              onOpenChange(false)
            }}
          />
        </Card>
      </DialogContent>
    </Dialog>
  )
}
