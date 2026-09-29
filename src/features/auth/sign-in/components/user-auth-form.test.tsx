import { AxiosError } from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type Locator, userEvent } from 'vitest/browser'
import { UserAuthForm } from './user-auth-form'

const FORM_MESSAGES = {
  emailEmpty: 'Please enter your email.',
  passwordEmpty: 'Please enter your password.',
} as const

const navigate = vi.fn()
const setUserMock = vi.fn()
const setSessionMock = vi.fn()
const loginMock = vi.hoisted(() => vi.fn())

const admin = {
  id: 'admin-1',
  name: 'Administrator',
  email: 'a@b.com',
  role: 'ADMIN',
}

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    auth: {
      setUser: setUserMock,
      setSession: setSessionMock,
    },
  }),
}))

vi.mock('../../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api')>()),
  login: loginMock,
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

function renderForm(props: React.ComponentProps<typeof UserAuthForm> = {}) {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <UserAuthForm {...props} />
    </QueryClientProvider>
  )
}

describe('UserAuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loginMock.mockResolvedValue({
      token: 'jwt-token',
      tokenType: 'Bearer',
      expiresAt: '2026-10-14T00:00:00.000Z',
      refreshToken: 'refresh-token',
      refreshExpiresAt: '2026-10-30T00:00:00.000Z',
      admin,
    })
  })

  describe('Rendering without redirectTo', () => {
    let screen: RenderResult
    let emailInput: Locator
    let passwordInput: Locator
    let signInButton: Locator

    beforeEach(async () => {
      screen = await renderForm()
      emailInput = screen.getByRole('textbox', { name: /^Email$/i })
      passwordInput = screen.getByLabelText(/^Password$/i)
      signInButton = screen.getByRole('button', { name: /^Sign in$/i })
    })

    it('renders fields and submit button without demo links', async () => {
      await expect.element(emailInput).toBeInTheDocument()
      await expect.element(passwordInput).toBeInTheDocument()
      await expect.element(signInButton).toBeInTheDocument()
      await expect
        .element(screen.getByText(/Forgot password/i))
        .not.toBeInTheDocument()
    })

    it('shows validation messages when submitting empty form', async () => {
      await userEvent.click(signInButton)

      await expect
        .element(screen.getByText(FORM_MESSAGES.emailEmpty))
        .toBeInTheDocument()
      await expect
        .element(screen.getByText(FORM_MESSAGES.passwordEmpty))
        .toBeInTheDocument()
      expect(loginMock).not.toHaveBeenCalled()
    })

    it('stores the session and navigates to /clients on success', async () => {
      await userEvent.fill(emailInput, 'a@b.com')
      await userEvent.fill(passwordInput, 'secret')

      await userEvent.click(signInButton)

      await vi.waitFor(() => expect(setUserMock).toHaveBeenCalledOnce())
      expect(loginMock.mock.calls[0][0]).toEqual({
        email: 'a@b.com',
        password: 'secret',
      })
      expect(setUserMock).toHaveBeenCalledWith(admin)
      expect(setSessionMock).toHaveBeenCalledWith({
        token: 'jwt-token',
        tokenType: 'Bearer',
        expiresAt: '2026-10-14T00:00:00.000Z',
        refreshToken: 'refresh-token',
        refreshExpiresAt: '2026-10-30T00:00:00.000Z',
      })
      await vi.waitFor(() =>
        expect(navigate).toHaveBeenCalledWith({
          href: '/clients',
          replace: true,
        })
      )
    })

    it('shows the backend message when credentials are rejected', async () => {
      const error = new AxiosError('Unauthorized')
      error.response = {
        status: 401,
        data: { success: false, message: 'Invalid email or password' },
      } as AxiosError['response']
      loginMock.mockRejectedValue(error)

      await userEvent.fill(emailInput, 'a@b.com')
      await userEvent.fill(passwordInput, 'wrong')
      await userEvent.click(signInButton)

      await expect
        .element(screen.getByText('Invalid email or password'))
        .toBeInTheDocument()
      expect(setSessionMock).not.toHaveBeenCalled()
      expect(navigate).not.toHaveBeenCalled()
    })
  })

  it('navigates to an in-app redirectTo when provided', async () => {
    const { getByRole, getByLabelText } = await renderForm({
      redirectTo: '/clients?page=2',
    })

    await userEvent.fill(getByRole('textbox', { name: /Email/i }), 'a@b.com')
    await userEvent.fill(getByLabelText('Password'), 'secret')
    await userEvent.click(getByRole('button', { name: /Sign in/i }))

    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        href: '/clients?page=2',
        replace: true,
      })
    )
  })

  it('ignores external redirect targets', async () => {
    const { getByRole, getByLabelText } = await renderForm({
      redirectTo: 'https://evil.example/phish',
    })

    await userEvent.fill(getByRole('textbox', { name: /Email/i }), 'a@b.com')
    await userEvent.fill(getByLabelText('Password'), 'secret')
    await userEvent.click(getByRole('button', { name: /Sign in/i }))

    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ href: '/clients', replace: true })
    )
  })
})
