import { useCallback, useMemo, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { Loader2, Maximize2, RotateCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { ClientDetailSheet } from '@/features/clients/components/client-detail-sheet'
import { ClientsToolbar } from '@/features/clients/components/clients-toolbar'
import {
  useCommunes,
  useDistricts,
  useProvinces,
} from '@/features/clients/data/queries'
import {
  type ClientFilters,
  type Submission,
} from '@/features/clients/data/schema'
import { locationName } from '@/features/clients/lib/format'
import { OutletMap } from './components/outlet-map'
import { type MapPoint, useMapPoints } from './data/api'

const route = getRouteApi('/_authenticated/client-map/')

/** The detail sheet shows the row immediately and loads the full outlet itself */
const toSubmission = (point: MapPoint): Submission => ({
  id: point.submissionId,
  submissionNo: '',
  clientName: point.clientName,
  phone: point.phone,
  province: {
    id: null,
    nameKh: point.provinceNameKh,
    nameEn: point.provinceNameEn,
  },
  district: {
    id: null,
    nameKh: point.districtNameKh,
    nameEn: point.districtNameEn,
  },
  commune: {
    id: null,
    nameKh: point.communeNameKh,
    nameEn: point.communeNameEn,
  },
  saleGb: null,
  submittedAt: point.submittedAt,
  files: [],
  hasGps: true,
})

/** "Phnom Penh · Chamkar Mon" for the chosen location filters (already cached by the dropdowns) */
function useFilterPlace({ provinceId, districtId, communeId }: ClientFilters) {
  const provinces = useProvinces()
  const districts = useDistricts(provinceId)
  const communes = useCommunes(districtId, provinceId)
  return [
    provinces.data?.find((p) => p.id === provinceId),
    districts.data?.find((d) => d.id === districtId),
    communes.data?.find((c) => c.id === communeId),
  ]
    .map((item) => locationName(item))
    .filter(Boolean)
    .join(' · ')
}

export function ClientMap() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { provinceId, districtId, communeId, dateFrom, dateTo } = search
  const filters = useMemo<ClientFilters>(
    () => ({ provinceId, districtId, communeId, dateFrom, dateTo }),
    [provinceId, districtId, communeId, dateFrom, dateTo]
  )
  const filterPlace = useFilterPlace(filters)

  const query = useMapPoints({ ...filters, submissionId: search.submissionId })
  const points = useMemo(() => query.data?.points ?? [], [query.data])
  const [fitSignal, setFitSignal] = useState(0)

  // A filter change also leaves the single-outlet view from "View on map"
  const updateFilters = useCallback(
    (patch: Partial<ClientFilters>) => {
      const { search: _ignored, ...locationAndDate } = patch
      navigate({
        search: (prev) => ({
          ...prev,
          ...locationAndDate,
          submissionId: undefined,
          photoId: undefined,
        }),
        replace: true,
      })
    },
    [navigate]
  )

  const clearFilters = useCallback(() => {
    navigate({ search: (prev) => ({ sequence: prev.sequence }) })
  }, [navigate])

  const showAllOutlets = () =>
    navigate({
      search: (prev) => ({
        ...prev,
        submissionId: undefined,
        photoId: undefined,
      }),
    })

  const [selected, setSelected] = useState<Submission | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const viewDetails = useCallback((point: MapPoint) => {
    setSelected(toSubmission(point))
    setSheetOpen(true)
  }, [])

  const focusedOutlet = search.submissionId
    ? points.find((p) => p.submissionId === search.submissionId)
    : undefined

  const sequenceToggle = (
    <div className='flex items-center gap-2'>
      <Checkbox
        id='capture-sequence'
        checked={!!search.sequence}
        onCheckedChange={(checked) =>
          navigate({
            search: (prev) => ({
              ...prev,
              sequence: checked === true || undefined,
            }),
            replace: true,
          })
        }
      />
      <Label htmlFor='capture-sequence' className='font-normal'>
        Capture sequence
      </Label>
    </div>
  )

  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center gap-2'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Outlet Map</h2>
          <p className='text-muted-foreground'>
            View outlet submission locations
          </p>
        </div>

        <ClientsToolbar
          filters={filters}
          onFiltersChange={updateFilters}
          onClear={clearFilters}
          searchable={false}
          actions={sequenceToggle}
        />

        {search.submissionId && (
          <div className='flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm'>
            <span>
              Showing photos of{' '}
              <span className='font-medium'>
                {focusedOutlet?.clientName ?? 'one outlet'}
              </span>
            </span>
            <Button variant='ghost' size='sm' onClick={showAllOutlets}>
              <X />
              Show all outlets
            </Button>
          </div>
        )}

        {/* isolate keeps Leaflet's z-indexes below the header and the sheet */}
        <div className='relative isolate h-120 overflow-hidden rounded-md border sm:h-140 lg:h-160'>
          <OutletMap
            points={points}
            showSequence={!!search.sequence}
            focusId={search.photoId}
            fitSignal={fitSignal}
            onViewDetails={viewDetails}
          />

          {points.length > 0 && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => setFitSignal((n) => n + 1)}
              className='absolute end-3 top-3 z-1000 bg-background'
            >
              <Maximize2 />
              Fit locations
            </Button>
          )}

          {query.isPending && (
            <div className='pointer-events-none absolute inset-0 z-1000 flex items-center justify-center bg-background/40'>
              <p className='flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground'>
                <Loader2 className='size-4 animate-spin' />
                Loading locations...
              </p>
            </div>
          )}

          {query.isError && (
            <div className='absolute inset-0 z-1000 flex items-center justify-center p-4'>
              <div className='flex flex-col items-center gap-3 rounded-md border bg-background px-5 py-4 text-center text-sm'>
                <p>Unable to load client locations.</p>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => query.refetch()}
                  disabled={query.isFetching}
                >
                  <RotateCw
                    className={query.isFetching ? 'animate-spin' : ''}
                  />
                  Retry
                </Button>
              </div>
            </div>
          )}

          {query.isSuccess && points.length === 0 && (
            <div className='pointer-events-none absolute inset-0 z-1000 flex items-center justify-center p-4'>
              <p className='rounded-md border bg-background px-4 py-2 text-center text-sm'>
                No client locations found for these filters.
              </p>
            </div>
          )}
        </div>

        <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm'>
          <p
            className='flex items-center gap-2 text-muted-foreground'
            aria-live='polite'
          >
            {query.isPending ? (
              <Skeleton className='h-4 w-36' />
            ) : query.isError ? null : (
              <>
                {filterPlace && (
                  <span className='font-medium text-foreground'>
                    {filterPlace}
                  </span>
                )}
                {filterPlace && <span aria-hidden>·</span>}
                <span>
                  Showing {points.length} location
                  {points.length === 1 ? '' : 's'}
                </span>
                {query.isFetching && (
                  <Loader2 className='size-3.5 animate-spin' />
                )}
              </>
            )}
          </p>
          {search.sequence && (
            <p className='text-xs text-muted-foreground'>
              Numbers follow capture time (oldest first). The line shows capture
              order, not the road travelled.
            </p>
          )}
        </div>

        {query.data?.notice && (
          <p className='text-sm text-muted-foreground'>{query.data.notice}</p>
        )}
      </Main>

      <ClientDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        submission={selected}
      />
    </>
  )
}
