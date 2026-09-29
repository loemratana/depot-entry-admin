import { useState } from 'react'
import { CheckCircle2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ThemeSwitch } from '@/components/theme-switch'
import { SubmissionForm } from './components/submission-form'

function SubmitSuccess({ onReset }: { onReset: () => void }) {
  return (
    <Card className='w-full'>
      <CardContent className='flex flex-col items-center gap-4 py-6 text-center'>
        <CheckCircle2 className='size-12 text-green-600' />
        <div className='grid gap-1'>
          <h2 className='text-lg font-semibold'>បានទទួលព័ត៌មានរបស់អ្នកហើយ</h2>
          <p className='text-sm text-muted-foreground'>
            Your information was received successfully. Thank you!
          </p>
        </div>
        <Button variant='outline' onClick={onReset}>
          បញ្ជូនព័ត៌មានថ្មី · Submit another
        </Button>
      </CardContent>
    </Card>
  )
}

/** Public client entry form (no login, no admin layout) */
export function SubmitClient() {
  const [submitted, setSubmitted] = useState(false)
  // Remounting the form gives a clean state and a fresh idempotency key
  const [formKey, setFormKey] = useState(0)

  return (
    <div className='min-h-svh bg-muted/30'>
      <header className='border-b bg-background'>
        <div className='mx-auto flex h-14 max-w-xl items-center gap-2 px-4'>
          <div className='flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
            <Users className='size-4' />
          </div>
          <span className='font-medium'>Outlet Management</span>
          <div className='ms-auto'>
            <ThemeSwitch />
          </div>
        </div>
      </header>

      <main className='mx-auto w-full max-w-xl px-4 py-6 sm:py-10'>
        {submitted ? (
          <SubmitSuccess
            onReset={() => {
              setSubmitted(false)
              setFormKey((key) => key + 1)
              window.scrollTo({ top: 0 })
            }}
          />
        ) : (
          <Card className='w-full'>
            <CardHeader>
              <CardTitle className='text-lg'>ទម្រង់ព័ត៌មានអតិថិជន</CardTitle>
              <CardDescription>
                Client information form · សូមបំពេញព័ត៌មានខាងក្រោម (Please fill
                in the details below)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SubmissionForm
                key={formKey}
                onSuccess={() => {
                  setSubmitted(true)
                  window.scrollTo({ top: 0 })
                }}
              />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
