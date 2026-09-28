import { createFileRoute } from '@tanstack/react-router'
import { SubmitClient } from '@/features/submit'

// Public client entry form: outside the /_authenticated guard, no admin session needed
export const Route = createFileRoute('/(public)/submit')({
  component: SubmitClient,
})
