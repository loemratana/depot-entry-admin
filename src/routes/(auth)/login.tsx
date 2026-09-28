import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { SignIn } from '@/features/auth/sign-in'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/login')({
  validateSearch: searchSchema,
  beforeLoad: () => {
    if (useAuthStore.getState().auth.accessToken) {
      throw redirect({ to: '/clients', replace: true })
    }
  },
  component: SignIn,
})
