import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getErrorMessage } from '@/lib/handle-server-error'
import { type Permission } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Textarea } from '@/components/ui/textarea'
import {
  type PermissionGroup,
  type Role,
  useCreateRole,
  useUpdateRole,
} from '../data/api'

type RoleDialogProps = {
  /** null = closed; 'new' = create a role */
  role: Role | 'new' | null
  groups: PermissionGroup[]
  onOpenChange: (open: boolean) => void
  onSaved: (message: string) => void
}

/**
 * Name, description and a checkbox per permission, grouped by area. The
 * Super Admin role is shown read-only (it always has everything).
 */
export function RoleDialog({
  role,
  groups,
  onOpenChange,
  onSaved,
}: RoleDialogProps) {
  const editing = role && role !== 'new' ? role : null
  const readOnly = !!editing?.isSystem
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [granted, setGranted] = useState<Set<Permission>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const saving = createRole.isPending || updateRole.isPending

  const [openedFor, setOpenedFor] = useState<typeof role>(null)
  if (role !== openedFor) {
    setOpenedFor(role)
    if (role) {
      setName(editing?.name ?? '')
      setDescription(editing?.description ?? '')
      setGranted(new Set(editing?.permissions ?? []))
      setError(null)
    }
  }

  const toggle = (keys: Permission[], on: boolean) =>
    setGranted((prev) => {
      const next = new Set(prev)
      for (const key of keys) {
        if (on) next.add(key)
        else next.delete(key)
      }
      return next
    })

  const save = () => {
    if (name.trim().length < 2) {
      setError('Enter a name of at least 2 characters.')
      return
    }
    setError(null)
    const input = {
      name: name.trim(),
      description: description.trim(),
      permissions: [...granted],
    }
    const onError = (e: unknown) =>
      setError(getErrorMessage(e, 'Unable to save the role.'))
    if (editing) {
      updateRole.mutate(
        { id: editing.id, ...input },
        { onSuccess: () => onSaved('Role updated'), onError }
      )
    } else {
      createRole.mutate(input, {
        onSuccess: () => onSaved('Role created'),
        onError,
      })
    }
  }

  return (
    <Dialog
      open={role !== null}
      onOpenChange={(o) => !saving && onOpenChange(o)}
    >
      <DialogContent className='flex max-h-[90svh] flex-col sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>
            {readOnly ? editing?.name : editing ? 'Edit role' : 'New role'}
          </DialogTitle>
          <DialogDescription>
            {readOnly
              ? 'Super Admin always has every permission, including ones added later. It cannot be changed.'
              : 'Tick what users with this role may do. Changes apply to them on their next action, without signing out.'}
          </DialogDescription>
        </DialogHeader>

        <form
          id='role-form'
          className='-mx-6 grid flex-1 gap-4 overflow-y-auto px-6'
          onSubmit={(e) => {
            e.preventDefault()
            if (!readOnly) save()
          }}
        >
          {!readOnly && (
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-2'>
                <Label htmlFor='role-name'>Name</Label>
                <Input
                  id='role-name'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  placeholder='e.g. Sale'
                />
              </div>
              <div className='grid gap-2 sm:col-span-2'>
                <Label htmlFor='role-description'>Description</Label>
                <Textarea
                  id='role-description'
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder='What this role is for (optional)'
                />
              </div>
            </div>
          )}

          <div className='grid gap-3 sm:grid-cols-2'>
            {groups.map((group) => {
              const keys = group.permissions.map((p) => p.key)
              const count = keys.filter((k) => granted.has(k)).length
              const all = readOnly || count === keys.length
              return (
                <fieldset
                  key={group.key}
                  className='overflow-hidden rounded-md border'
                >
                  <legend className='sr-only'>{group.label}</legend>
                  <label className='flex cursor-pointer items-center gap-2 bg-[#5027F5] px-3 py-2 text-sm font-medium text-white'>
                    <Checkbox
                      checked={all ? true : count > 0 ? 'indeterminate' : false}
                      disabled={readOnly}
                      onCheckedChange={(on) => toggle(keys, on === true)}
                      className='border-white data-[state=checked]:bg-white data-[state=checked]:text-[#5027F5] data-[state=indeterminate]:bg-white data-[state=indeterminate]:text-[#5027F5]'
                      aria-label={`All ${group.label} permissions`}
                    />
                    {group.label}
                    <span className='ms-auto text-xs font-normal opacity-80'>
                      {readOnly ? keys.length : count}/{keys.length}
                    </span>
                  </label>
                  <div className='grid gap-1 p-2'>
                    {group.permissions.map((permission) => (
                      <label
                        key={permission.key}
                        className='flex cursor-pointer items-start gap-2 rounded-sm px-1 py-1 text-sm hover:bg-muted/60'
                      >
                        <Checkbox
                          className='mt-0.5'
                          checked={readOnly || granted.has(permission.key)}
                          disabled={readOnly}
                          onCheckedChange={(on) =>
                            toggle([permission.key], on === true)
                          }
                        />
                        <span>{permission.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )
            })}
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
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
          {!readOnly && (
            <Button
              type='submit'
              form='role-form'
              disabled={saving}
              className='bg-[#5027F5] text-white hover:bg-[#4119d9]'
            >
              {saving && <Loader2 className='animate-spin' />}
              {editing ? 'Save' : 'Create role'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
