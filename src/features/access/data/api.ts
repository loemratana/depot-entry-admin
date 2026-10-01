import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore, type AuthUser } from '@/stores/auth-store'
import { apiClient, type ApiResponse } from '@/lib/api-client'
import { type Permission } from '@/lib/permissions'
import { currentAdminQueryOptions } from '@/features/auth/api'

export type RoleSummary = { id: string; name: string; isSystem: boolean }

export type AdminUser = {
  id: string
  name: string
  email: string
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  role: RoleSummary | null
}

export type Role = {
  id: string
  name: string
  description: string
  /** Super Admin: every permission, cannot be changed */
  isSystem: boolean
  permissions: Permission[]
  userCount: number
}

export type PermissionGroup = {
  key: string
  label: string
  permissions: { key: Permission; label: string }[]
}

export type UserInput = {
  name: string
  email: string
  roleId: string
  isActive?: boolean
  password?: string
}

export type RoleInput = {
  name: string
  description: string
  permissions: Permission[]
}

const keys = {
  users: ['access', 'users'] as const,
  roles: ['access', 'roles'] as const,
  permissions: ['access', 'permissions'] as const,
}

export function useUsers() {
  return useQuery({
    queryKey: keys.users,
    queryFn: async () =>
      (await apiClient.get<ApiResponse<AdminUser[]>>('/admin/users')).data.data,
  })
}

export function useRoles(enabled = true) {
  return useQuery({
    queryKey: keys.roles,
    queryFn: async () =>
      (await apiClient.get<ApiResponse<Role[]>>('/admin/roles')).data.data,
    enabled,
  })
}

export function usePermissionGroups() {
  return useQuery({
    queryKey: keys.permissions,
    queryFn: async () =>
      (
        await apiClient.get<ApiResponse<PermissionGroup[]>>(
          '/admin/roles/permissions'
        )
      ).data.data,
    staleTime: Infinity,
  })
}

/**
 * Refreshes users and roles, and the signed-in user's own permissions
 * (editing your own role's permissions changes what you can see at once).
 */
function useRefresh() {
  const queryClient = useQueryClient()
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.users }),
      queryClient.invalidateQueries({ queryKey: keys.roles }),
    ])
    try {
      const me = await queryClient.fetchQuery({
        ...currentAdminQueryOptions,
        staleTime: 0,
      })
      useAuthStore.getState().auth.setUser(me as AuthUser)
    } catch {
      // The pages keep working; permissions refresh on the next page load
    }
  }
}

export function useCreateUser() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (input: UserInput) =>
      (await apiClient.post<ApiResponse<AdminUser>>('/admin/users', input)).data
        .data,
    onSuccess: refresh,
  })
}

export function useUpdateUser() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<UserInput> & { id: string }) =>
      (
        await apiClient.patch<ApiResponse<AdminUser>>(
          `/admin/users/${encodeURIComponent(id)}`,
          input
        )
      ).data.data,
    onSuccess: refresh,
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      await apiClient.post(`/admin/users/${encodeURIComponent(id)}/password`, {
        password,
      })
    },
  })
}

export function useCreateRole() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (input: RoleInput) =>
      (await apiClient.post<ApiResponse<Role>>('/admin/roles', input)).data
        .data,
    onSuccess: refresh,
  })
}

export function useUpdateRole() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<RoleInput> & { id: string }) =>
      (
        await apiClient.patch<ApiResponse<Role>>(
          `/admin/roles/${encodeURIComponent(id)}`,
          input
        )
      ).data.data,
    onSuccess: refresh,
  })
}

export function useDeleteRole() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/admin/roles/${encodeURIComponent(id)}`)
    },
    onSuccess: refresh,
  })
}
