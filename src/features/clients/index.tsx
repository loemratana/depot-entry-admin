import { useCallback, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { ClientDetailSheet } from './components/client-detail-sheet'
import { ClientsExportButton } from './components/clients-export-button'
import { ClientsTable } from './components/clients-table'
import { ClientsToolbar } from './components/clients-toolbar'
import { CopyFormLinkButton } from './components/copy-form-link-button'
import { type ClientFilters, type Submission, pickFilters } from './data/schema'

const route = getRouteApi('/_authenticated/clients/')

export function Clients() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const filters = pickFilters(search)
  const hasActiveFilters = Object.keys(filters).length > 0

  const [selected, setSelected] = useState<Submission | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Any filter change returns to the first page (page=undefined → default 1)
  const updateFilters = useCallback(
    (patch: Partial<ClientFilters>) => {
      navigate({
        search: (prev) => ({ ...prev, ...patch, page: undefined }),
        replace: true,
      })
    },
    [navigate]
  )

  // Keeps the chosen page size, drops everything else
  const clearFilters = useCallback(() => {
    navigate({ search: (prev) => ({ limit: prev.limit }) })
  }, [navigate])

  const viewSubmission = useCallback((submission: Submission) => {
    setSelected(submission)
    setSheetOpen(true)
  }, [])

  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center gap-2'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Clients</h2>
            <p className='text-muted-foreground'>
              View and filter client submissions
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <CopyFormLinkButton />
            <ClientsExportButton filters={filters} />
          </div>
        </div>

        <ClientsToolbar
          filters={filters}
          onFiltersChange={updateFilters}
          onClear={clearFilters}
        />

        <ClientsTable
          search={search}
          navigate={navigate}
          filters={filters}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          onView={viewSubmission}
        />
      </Main>

      <ClientDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        submission={selected}
      />
    </>
  )
}
