import { useState } from 'react'
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  KeyRound,
  Pencil,
  Plus,
  RotateCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { getErrorMessage } from '@/lib/handle-server-error'
import { useCan } from '@/lib/permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { ActionButton } from '@/features/clients/components/action-button'
import { formatDateTime } from '@/features/clients/lib/format'
import { ResetPasswordDialog } from './components/reset-password-dialog'
import { UserDialog } from './components/user-dialog'
import { type AdminUser, useRoles, useUpdateUser, useUsers } from './data/api'

/** Admin accounts: add, edit, change role, activate/deactivate, reset password */
export function Users() {
  const can = useCan()
  const canManage = can('users.manage')
  const me = useAuthStore((state) => state.auth.user)
  const amSuperAdmin = !!me?.role?.isSystem

  const users = useUsers()
  const roles = useRoles()
  const updateUser = useUpdateUser()

  const [dialog, setDialog] = useState<AdminUser | 'new' | null>(null)
  const [resetFor, setResetFor] = useState<AdminUser | null>(null)
  const [toToggle, setToToggle] = useState<AdminUser | null>(null)

  const saved = (close: () => void) => (message: string) => {
    toast.success(message)
    close()
  }

  // Super Admin accounts can only be changed by a Super Admin
  const canEdit = (user: AdminUser) =>
    canManage && (!user.role?.isSystem || amSuperAdmin)

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
            <h2 className='text-2xl font-bold tracking-tight'>Users</h2>
            <p className='text-muted-foreground'>
              Who can sign in to the admin, and with which role
            </p>
          </div>
          {canManage && (
            <Button
              className='bg-[#5027F5] text-white hover:bg-[#4119d9]'
              onClick={() => setDialog('new')}
            >
              <Plus /> Add user
            </Button>
          )}
        </div>

        <div className='overflow-x-auto rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='hidden @2xl/content:table-cell'>
                  Last sign-in
                </TableHead>
                <TableHead className='w-32'>
                  <span className='sr-only'>Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.isPending ? (
                Array.from({ length: 4 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className='h-8 w-full' />
                    </TableCell>
                  </TableRow>
                ))
              ) : users.isError ? (
                <TableRow>
                  <TableCell colSpan={5} className='h-32 text-center'>
                    <div className='flex flex-col items-center gap-2 text-sm'>
                      <AlertCircle className='size-5 text-destructive' />
                      {getErrorMessage(users.error, 'Unable to load users.')}
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => users.refetch()}
                      >
                        <RotateCw /> Retry
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.data.map((user) => {
                  const isSelf = user.id === me?.id
                  const editable = canEdit(user)
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <span className='block font-medium'>
                          {user.name}
                          {isSelf && (
                            <span className='ms-1.5 text-xs font-normal text-muted-foreground'>
                              (you)
                            </span>
                          )}
                        </span>
                        <span className='block text-xs text-muted-foreground'>
                          {user.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.role ? (
                          <Badge
                            className={
                              user.role.isSystem
                                ? 'bg-[#5027F5] text-white'
                                : undefined
                            }
                            variant={
                              user.role.isSystem ? 'default' : 'secondary'
                            }
                          >
                            {user.role.name}
                          </Badge>
                        ) : (
                          <Badge variant='outline'>No role</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.isActive ? (
                          <Badge className='bg-emerald-600 text-white'>
                            Active
                          </Badge>
                        ) : (
                          <Badge variant='outline'>Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className='hidden text-sm text-muted-foreground @2xl/content:table-cell'>
                        {formatDateTime(user.lastLoginAt) ?? 'Never'}
                      </TableCell>
                      <TableCell>
                        {editable && (
                          <div className='flex justify-end gap-1.5'>
                            <ActionButton
                              label={`Edit ${user.name}`}
                              tooltip='Edit'
                              className='bg-amber-500 hover:bg-amber-600'
                              onClick={() => setDialog(user)}
                            >
                              <Pencil />
                            </ActionButton>
                            <ActionButton
                              label={`Reset password of ${user.name}`}
                              tooltip='Reset password'
                              className='bg-slate-600 hover:bg-slate-700'
                              onClick={() => setResetFor(user)}
                            >
                              <KeyRound />
                            </ActionButton>
                            {!isSelf && (
                              <ActionButton
                                label={`${user.isActive ? 'Deactivate' : 'Activate'} ${user.name}`}
                                tooltip={
                                  user.isActive ? 'Deactivate' : 'Activate'
                                }
                                className={
                                  user.isActive
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-emerald-600 hover:bg-emerald-700'
                                }
                                onClick={() => setToToggle(user)}
                              >
                                {user.isActive ? <Ban /> : <CheckCircle2 />}
                              </ActionButton>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Main>

      <UserDialog
        user={dialog}
        roles={roles.data ?? []}
        isSelf={dialog !== null && dialog !== 'new' && dialog.id === me?.id}
        canAssignSuperAdmin={amSuperAdmin}
        onOpenChange={(open) => !open && setDialog(null)}
        onSaved={saved(() => setDialog(null))}
      />

      <ResetPasswordDialog
        user={resetFor}
        onOpenChange={(open) => !open && setResetFor(null)}
        onSaved={saved(() => setResetFor(null))}
      />

      <ConfirmDialog
        open={!!toToggle}
        onOpenChange={(open) =>
          !open && !updateUser.isPending && setToToggle(null)
        }
        title={
          toToggle?.isActive
            ? `Deactivate ${toToggle.name}?`
            : `Activate ${toToggle?.name}?`
        }
        desc={
          toToggle?.isActive
            ? 'They are signed out at once and cannot sign in until activated again.'
            : 'They can sign in again with their current password.'
        }
        confirmText={toToggle?.isActive ? 'Deactivate' : 'Activate'}
        destructive={!!toToggle?.isActive}
        isLoading={updateUser.isPending}
        handleConfirm={() => {
          if (!toToggle) return
          updateUser.mutate(
            { id: toToggle.id, isActive: !toToggle.isActive },
            {
              onSuccess: () => {
                toast.success(
                  toToggle.isActive ? 'User deactivated' : 'User activated'
                )
                setToToggle(null)
              },
              onError: (error) =>
                toast.error(
                  getErrorMessage(error, 'Unable to update the user.')
                ),
            }
          )
        }}
      />
    </>
  )
}
