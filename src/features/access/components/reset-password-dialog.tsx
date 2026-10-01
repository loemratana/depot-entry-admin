import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getErrorMessage } from '@/lib/handle-server-error'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/password-input'
import { type AdminUser, useResetPassword } from '../data/api'
import { MIN_PASSWORD } from './user-dialog'

type ResetPasswordDialogProps = {
  user: AdminUser | null
  onOpenChange: (open: boolean) => void
  onSaved: (message: string) => void
}

/** Sets a new password; the user's signed-in devices must log in again */
export function ResetPasswordDialog({
  user,
  onOpenChange,
  onSaved,
}: ResetPasswordDialogProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const reset = useResetPassword()

  const [openedFor, setOpenedFor] = useState<AdminUser | null>(null)
  if (user !== openedFor) {
    setOpenedFor(user)
    setPassword('')
    setConfirm('')
    setError(null)
  }

  const save = () => {
    if (!user) return
    if (password.length < MIN_PASSWORD) {
      setError(`The password needs at least ${MIN_PASSWORD} characters.`)
      return
    }
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setError(null)
    reset.mutate(
      { id: user.id, password },
      {
        onSuccess: () => onSaved(`Password reset for ${user.name}`),
        onError: (e) =>
          setError(getErrorMessage(e, 'Unable to reset the password.')),
      }
    )
  }

  return (
    <Dialog
      open={user !== null}
      onOpenChange={(o) => !reset.isPending && onOpenChange(o)}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            New password for <strong>{user?.name}</strong>. They will be signed
            out everywhere and must sign in with the new password.
          </DialogDescription>
        </DialogHeader>
        <form
          id='reset-password-form'
          className='grid gap-4'
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <div className='grid gap-2'>
            <Label htmlFor='new-password'>New password</Label>
            <PasswordInput
              id='new-password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete='new-password'
              placeholder={`At least ${MIN_PASSWORD} characters`}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='confirm-password'>Confirm password</Label>
            <PasswordInput
              id='confirm-password'
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete='new-password'
            />
          </div>
          {error && (
            <p role='alert' className='text-sm text-destructive'>
              {error}
            </p>
          )}
        </form>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={reset.isPending}
          >
            Cancel
          </Button>
          <Button
            type='submit'
            form='reset-password-form'
            disabled={reset.isPending}
            className='bg-[#5027F5] text-white hover:bg-[#4119d9]'
          >
            {reset.isPending && <Loader2 className='animate-spin' />}
            Reset password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
