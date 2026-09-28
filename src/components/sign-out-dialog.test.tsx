import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { SignOutDialog } from './sign-out-dialog'

const navigate = vi.fn()
const reset = vi.fn()
const logoutMock = vi.hoisted(() => vi.fn())

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    auth: { reset },
  }),
}))

vi.mock('@/features/auth/api', () => ({
  logout: logoutMock,
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

function renderDialog() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <SignOutDialog open onOpenChange={vi.fn()} />
    </QueryClientProvider>
  )
}

describe('SignOutDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    logoutMock.mockResolvedValue(undefined)
  })

  it('revokes the session, resets auth and navigates to login', async () => {
    const { getByRole } = await renderDialog()

    await userEvent.click(getByRole('button', { name: /^Sign out$/i }))

    await vi.waitFor(() => expect(reset).toHaveBeenCalledOnce())
    expect(logoutMock).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith({ to: '/login', replace: true })
  })

  it('still signs out locally when the logout request fails', async () => {
    logoutMock.mockRejectedValue(new Error('offline'))
    const { getByRole } = await renderDialog()

    await userEvent.click(getByRole('button', { name: /^Sign out$/i }))

    await vi.waitFor(() => expect(reset).toHaveBeenCalledOnce())
    expect(navigate).toHaveBeenCalledWith({ to: '/login', replace: true })
  })

  it('does not call reset or navigate when Cancel is clicked', async () => {
    const { getByRole } = await renderDialog()

    await userEvent.click(getByRole('button', { name: /^Cancel$/i }))

    expect(logoutMock).not.toHaveBeenCalled()
    expect(reset).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })
})
