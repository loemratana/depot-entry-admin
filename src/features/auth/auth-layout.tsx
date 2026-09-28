import { Users } from 'lucide-react'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className='grid min-h-svh lg:grid-cols-2'>
      <div className='flex flex-col gap-4 p-6 md:p-10'>
        <div className='flex items-center gap-2'>
          <div className='flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
            <Users className='size-4' />
          </div>
          <span className='text-lg font-medium'>Client Management</span>
        </div>
        <div className='flex flex-1 items-center justify-center'>
          <div className='w-full max-w-sm'>{children}</div>
        </div>
      </div>

      {/* The illustration has a white background, so the panel stays light in dark mode too */}
      <div className='p-4 max-lg:hidden'>
        <div className='flex h-full items-center justify-center overflow-hidden rounded-2xl bg-white'>
          <img
            src='/images/loginScreen.jpg'
            alt=''
            width={1920}
            height={1920}
            className='aspect-square w-full max-w-2xl object-contain select-none'
            draggable={false}
          />
        </div>
      </div>
    </div>
  )
}
