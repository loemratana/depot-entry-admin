import { useSearch } from '@tanstack/react-router'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/login' })

  return (
    <AuthLayout>
      <div className='flex flex-col gap-6'>
        <div className='flex flex-col gap-1'>
          <h1 className='text-2xl font-semibold tracking-tight'>Sign in</h1>
          <p className='text-sm text-muted-foreground'>
            Enter your admin email and password to continue.
          </p>
        </div>
        <UserAuthForm redirectTo={redirect} />
      </div>
    </AuthLayout>
  )
}
