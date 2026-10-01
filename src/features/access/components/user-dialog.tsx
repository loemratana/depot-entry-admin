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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PasswordInput } from '@/components/password-input'
import {
  type AdminUser,
  type Role,
  useCreateUser,
  useUpdateUser,
} from '../data/api'

export const MIN_PASSWORD = 8
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type UserDialogProps = {
  /** null = closed; 'new' = add a user */
  user: AdminUser | 'new' | null
  roles: Role[]
  /** Your own account: its role cannot be changed */
  isSelf: boolean
  /** Only a Super Admin may give out the Super Admin role */
  canAssignSuperAdmin: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (message: string) => void
}

/** Add a user (with a first password) or edit name, email and role */
export function UserDialog({
  user,
  roles,
  isSelf,
  canAssignSuperAdmin,
  onOpenChange,
  onSaved,
}: UserDialogProps) {
  const editing = user && user !== 'new' ? user : null
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [roleId, setRoleId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const saving = createUser.isPending || updateUser.isPending

  // Fill the form each time the dialog opens
  const [openedFor, setOpenedFor] = useState<typeof user>(null)
  if (user !== openedFor) {
    setOpenedFor(user)
    if (user) {
      setName(editing?.name ?? '')
      setEmail(editing?.email ?? '')
      setPassword('')
      setRoleId(editing?.role?.id ?? '')
      setError(null)
    }
  }

  const choosable = roles.filter(
    (role) => !role.isSystem || canAssignSuperAdmin || role.id === roleId
  )

  const problem =
    name.trim().length < 2
      ? 'Enter a name of at least 2 characters.'
      : !EMAIL.test(email.trim())
        ? 'Enter a valid email address.'
        : !roleId
          ? 'Choose a role.'
          : !editing && password.length < MIN_PASSWORD
            ? `The password needs at least ${MIN_PASSWORD} characters.`
            : null

  const save = () => {
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    const input = { name: name.trim(), email: email.trim(), roleId }
    const onError = (e: unknown) =>
      setError(getErrorMessage(e, 'Unable to save the user.'))
    if (editing) {
      updateUser.mutate(
        { id: editing.id, ...input },
        { onSuccess: () => onSaved('User updated'), onError }
      )
    } else {
      createUser.mutate(
        { ...input, password },
        { onSuccess: () => onSaved('User added'), onError }
      )
    }
  }

  return (
    <Dialog
      open={user !== null}
      onOpenChange={(o) => !saving && onOpenChange(o)}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit user' : 'Add user'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Change the name, email or role. Use Reset password to set a new password.'
              : 'The user signs in with this email and password. Their role decides what they can see and do.'}
          </DialogDescription>
        </DialogHeader>

        <form
          id='user-form'
          className='grid gap-4'
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <div className='grid gap-2'>
            <Label htmlFor='user-name'>Name</Label>
            <Input
              id='user-name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              autoComplete='off'
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='user-email'>Email</Label>
            <Input
              id='user-email'
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete='off'
            />
          </div>
          {!editing && (
            <div className='grid gap-2'>
              <Label htmlFor='user-password'>Password</Label>
              <PasswordInput
                id='user-password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete='new-password'
                placeholder={`At least ${MIN_PASSWORD} characters`}
              />
            </div>
          )}
          <div className='grid gap-2'>
            <Label htmlFor='user-role'>Role</Label>
            <Select value={roleId} onValueChange={setRoleId} disabled={isSelf}>
              <SelectTrigger id='user-role' className='w-full'>
                <SelectValue placeholder='Choose a role' />
              </SelectTrigger>
              <SelectContent>
                {choosable.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSelf && (
              <p className='text-xs text-muted-foreground'>
                You cannot change your own role.
              </p>
            )}
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
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type='submit'
            form='user-form'
            disabled={saving}
            className='bg-[#5027F5] text-white hover:bg-[#4119d9]'
          >
            {saving && <Loader2 className='animate-spin' />}
            {editing ? 'Save' : 'Add user'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
