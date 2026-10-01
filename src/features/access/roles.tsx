import { useState } from 'react'
import { AlertCircle, Eye, Pencil, Plus, RotateCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/handle-server-error'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { ActionButton } from '@/features/clients/components/action-button'
import { RoleDialog } from './components/role-dialog'
import {
  type Role,
  useDeleteRole,
  usePermissionGroups,
  useRoles,
} from './data/api'

/** Roles and the permissions each one grants */
export function Roles() {
  const roles = useRoles()
  const groups = usePermissionGroups()
  const deleteRole = useDeleteRole()
  const [dialog, setDialog] = useState<Role | 'new' | null>(null)
  const [toDelete, setToDelete] = useState<Role | null>(null)

  const total = groups.data?.reduce((n, g) => n + g.permissions.length, 0) ?? 0
  // Short labels for the permission chips on each card
  const groupLabel = new Map(
    (groups.data ?? []).flatMap((g) =>
      g.permissions.map((p) => [p.key, g.label] as const)
    )
  )

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
            <h2 className='text-2xl font-bold tracking-tight'>
              Roles &amp; Permissions
            </h2>
            <p className='text-muted-foreground'>
              Each user has one role; the role decides which pages and actions
              they can use
            </p>
          </div>
          <Button
            className='bg-[#5027F5] text-white hover:bg-[#4119d9]'
            onClick={() => setDialog('new')}
            disabled={!groups.data}
          >
            <Plus /> New role
          </Button>
        </div>

        {roles.isPending ? (
          <div className='grid gap-4 md:grid-cols-2'>
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className='h-36 w-full' />
            ))}
          </div>
        ) : roles.isError ? (
          <div className='flex flex-col items-center gap-2 rounded-md border border-dashed p-8 text-sm'>
            <AlertCircle className='size-5 text-destructive' />
            {getErrorMessage(roles.error, 'Unable to load roles.')}
            <Button variant='outline' size='sm' onClick={() => roles.refetch()}>
              <RotateCw /> Retry
            </Button>
          </div>
        ) : (
          <div className='grid gap-4 md:grid-cols-2'>
            {roles.data.map((role) => {
              const areas = [
                ...new Set(role.permissions.map((p) => groupLabel.get(p) ?? p)),
              ]
              return (
                <section
                  key={role.id}
                  className='flex flex-col gap-3 rounded-lg border bg-card p-4'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <h3 className='flex flex-wrap items-center gap-2 font-semibold'>
                        {role.name}
                        {role.isSystem && (
                          <Badge className='bg-[#5027F5] text-white'>
                            Built-in
                          </Badge>
                        )}
                      </h3>
                      {role.description && (
                        <p className='mt-0.5 text-sm text-muted-foreground'>
                          {role.description}
                        </p>
                      )}
                    </div>
                    <div className='flex shrink-0 gap-1.5'>
                      {role.isSystem ? (
                        <ActionButton
                          label={`View ${role.name}`}
                          tooltip='View permissions'
                          className='bg-[#5027F5] hover:bg-[#4119d9]'
                          onClick={() => setDialog(role)}
                        >
                          <Eye />
                        </ActionButton>
                      ) : (
                        <>
                          <ActionButton
                            label={`Edit ${role.name}`}
                            tooltip='Edit'
                            className='bg-amber-500 hover:bg-amber-600'
                            onClick={() => setDialog(role)}
                          >
                            <Pencil />
                          </ActionButton>
                          <ActionButton
                            label={`Delete ${role.name}`}
                            tooltip={
                              role.userCount > 0
                                ? 'Give its users another role before deleting'
                                : 'Delete'
                            }
                            className='bg-red-600 hover:bg-red-700'
                            disabled={role.userCount > 0}
                            onClick={() => setToDelete(role)}
                          >
                            <Trash2 />
                          </ActionButton>
                        </>
                      )}
                    </div>
                  </div>

                  <div className='flex flex-wrap gap-1.5'>
                    {role.isSystem ? (
                      <Badge variant='secondary'>All permissions</Badge>
                    ) : areas.length === 0 ? (
                      <Badge variant='outline'>No permissions</Badge>
                    ) : (
                      areas.map((area) => (
                        <Badge key={area} variant='secondary'>
                          {area}
                        </Badge>
                      ))
                    )}
                  </div>

                  <p className='mt-auto text-xs text-muted-foreground'>
                    {role.userCount} user{role.userCount === 1 ? '' : 's'} ·{' '}
                    {role.isSystem ? total : role.permissions.length}/{total}{' '}
                    permissions
                  </p>
                </section>
              )
            })}
          </div>
        )}
      </Main>

      <RoleDialog
        role={dialog}
        groups={groups.data ?? []}
        onOpenChange={(open) => !open && setDialog(null)}
        onSaved={(message) => {
          toast.success(message)
          setDialog(null)
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) =>
          !open && !deleteRole.isPending && setToDelete(null)
        }
        title={`Delete the role "${toDelete?.name}"?`}
        desc='This cannot be undone.'
        confirmText='Delete'
        destructive
        isLoading={deleteRole.isPending}
        handleConfirm={() => {
          if (!toDelete) return
          deleteRole.mutate(toDelete.id, {
            onSuccess: () => {
              toast.success('Role deleted')
              setToDelete(null)
            },
            onError: (error) =>
              toast.error(getErrorMessage(error, 'Unable to delete the role.')),
          })
        }}
      />
    </>
  )
}
