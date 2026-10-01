import { useState } from 'react'
import { apiUrl } from '@/lib/api-client'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { type SubmitClientResult } from '../data/api'
import { type StockStep, SubmissionForm } from './submission-form'

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

/**
 * The outlet form with its heading, which switches to the stock title (and the
 * brand logo) on the stock steps. Used by the public /submit page and by the
 * admin "Add outlet" dialog, so both are always the same form.
 */
export function OutletEntry({
  endpoint,
  onSuccess,
}: {
  /** Where the form is sent; the admin uses /admin/submissions */
  endpoint?: string
  onSuccess: (result: SubmitClientResult) => void
}) {
  const [stockStep, setStockStep] = useState<StockStep | null>(null)
  const logoBrand = stockStep?.brand?.logoUrl ? stockStep.brand : null

  return (
    <>
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
                Stock count form · សូមបញ្ចូលចំនួនស្តុក (Enter the stock counts)
              </CardDescription>
            </div>
          </div>
        ) : (
          <>
            <CardTitle className='text-lg'>ទម្រង់ព័ត៌មានអតិថិជន</CardTitle>
            <CardDescription>
              Client information form · សូមបំពេញព័ត៌មានខាងក្រោម (Please fill in
              the details below)
            </CardDescription>
          </>
        )}
      </CardHeader>
      <CardContent>
        <SubmissionForm
          endpoint={endpoint}
          onStockStepChange={setStockStep}
          onSuccess={onSuccess}
        />
      </CardContent>
    </>
  )
}
