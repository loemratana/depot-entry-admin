import { useState } from 'react'
import { CheckCircle2, Users } from 'lucide-react'
import { apiUrl } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ThemeSwitch } from '@/components/theme-switch'
import { type StockStep, SubmissionForm } from './components/submission-form'

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

/** The current brand's logo in the stock heading; hidden if it cannot load */
function HeaderLogo({ name, url }: { name: string; url: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <img
      src={apiUrl(url)}
      alt={`${name} logo`}
      className='size-14 shrink-0 rounded-lg border bg-white object-contain p-1'
      onError={() => setFailed(true)}
    />
  )
}

/** Public client entry form (no login, no admin layout) */
export function SubmitClient() {
  const [submitted, setSubmitted] = useState(false)
  // Remounting the form gives a clean state and a fresh idempotency key
  const [formKey, setFormKey] = useState(0)
  // The stock steps get their own heading, with the current brand's logo
  const [stockStep, setStockStep] = useState<StockStep | null>(null)
  const logoBrand = stockStep?.brand?.logoUrl ? stockStep.brand : null

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
              setStockStep(null)
              setFormKey((key) => key + 1)
              window.scrollTo({ top: 0 })
            }}
          />
        ) : (
          <Card className='w-full'>
            <CardHeader>
              {stockStep ? (
                <div className='flex items-center gap-3'>
                  {logoBrand?.logoUrl && (
                    <HeaderLogo
                      // Restart for each brand so one broken logo does not hide the next
                      key={logoBrand.logoUrl}
                      name={logoBrand.name}
                      url={logoBrand.logoUrl}
                    />
                  )}
                  <div className='grid min-w-0 gap-1.5'>
                    <CardTitle className='text-lg'>
                      ទម្រង់បញ្ចូលទិន្នន័យរាប់ស្តុក
                    </CardTitle>
                    <CardDescription>
                      Stock count form · សូមបញ្ចូលចំនួនស្តុក (Enter the stock
                      counts)
                    </CardDescription>
                  </div>
                </div>
              ) : (
                <>
                  <CardTitle className='text-lg'>
                    ទម្រង់ព័ត៌មានអតិថិជន
                  </CardTitle>
                  <CardDescription>
                    Client information form · សូមបំពេញព័ត៌មានខាងក្រោម (Please
                    fill in the details below)
                  </CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent>
              <SubmissionForm
                key={formKey}
                onStockStepChange={setStockStep}
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
