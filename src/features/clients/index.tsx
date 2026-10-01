import { useCallback, useState } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useCan } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { AddOutletDialog } from './components/add-outlet-dialog'
import { ClientDetailSheet } from './components/client-detail-sheet'
import {
  ClientFormDialog,
  type ClientFormState,
} from './components/client-form-dialog'
import { ClientsExportButton } from './components/clients-export-button'
import { ClientsTable } from './components/clients-table'
import { ClientsToolbar } from './components/clients-toolbar'
import { CopyFormLinkButton } from './components/copy-form-link-button'
import { OutletStockSheet } from './components/outlet-stock-sheet'
import { useDeleteClient } from './data/queries'
import { type ClientFilters, type Submission, pickFilters } from './data/schema'

const route = getRouteApi('/_authenticated/clients/')

export function Clients() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const navigateTo = useNavigate()
  const filters = pickFilters(search)
  const can = useCan()
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

  // Outlet Map showing only this outlet's GPS photos
  const viewOnMap = useCallback(
    (submission: Submission) =>
      navigateTo({
        to: '/client-map',
        search: { submissionId: submission.id },
      }),
    [navigateTo]
  )

  const viewSubmission = useCallback((submission: Submission) => {
    setSelected(submission)
    setSheetOpen(true)
  }, [])

  // Latest stock report of one outlet
  const [stockOutlet, setStockOutlet] = useState<Submission | null>(null)
  const [stockOpen, setStockOpen] = useState(false)
  const viewStock = useCallback((submission: Submission) => {
    setStockOutlet(submission)
    setStockOpen(true)
  }, [])

  const [formState, setFormState] = useState<ClientFormState | null>(null)
  // Add uses the public outlet form; edit keeps the edit dialog
  const [addOpen, setAddOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Submission | null>(null)
  const deleteClient = useDeleteClient()

  const editClient = useCallback(
    (client: Submission) => setFormState({ mode: 'edit', client }),
    []
  )
  const confirmDelete = useCallback(
    (client: Submission) => setToDelete(client),
    []
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

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Outlet</h2>
            <p className='text-muted-foreground'>
              View and filter outlet submissions
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <CopyFormLinkButton />
            {can('outlets.export') && <ClientsExportButton filters={filters} />}
            {can('outlets.create') && (
              <Button onClick={() => setAddOpen(true)}>
                <Plus /> Add outlet
              </Button>
            )}
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
          onViewMap={can('map.view') ? viewOnMap : undefined}
          onViewStock={can('stock.view') ? viewStock : undefined}
          onEdit={can('outlets.update') ? editClient : undefined}
          onDelete={can('outlets.delete') ? confirmDelete : undefined}
        />
      </Main>

      <OutletStockSheet
        outlet={stockOutlet}
        open={stockOpen}
        onOpenChange={setStockOpen}
      />

      <ClientDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        submission={selected}
        onEdit={can('outlets.update') ? editClient : undefined}
        onDelete={can('outlets.delete') ? confirmDelete : undefined}
      />

      <AddOutletDialog open={addOpen} onOpenChange={setAddOpen} />

      <ClientFormDialog
        state={formState}
        onOpenChange={(open) => !open && setFormState(null)}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) =>
          !open && !deleteClient.isPending && setToDelete(null)
        }
        title={`Delete "${toDelete?.clientName}"?`}
        desc='The outlet and all attached files are permanently deleted. This cannot be undone.'
        confirmText='Delete'
        destructive
        isLoading={deleteClient.isPending}
        handleConfirm={() =>
          toDelete &&
          deleteClient.mutate(toDelete.id, {
            onSuccess: () => {
              toast.success('Outlet deleted', {
                description: toDelete.clientName,
              })
              // Close the detail sheet if it shows the deleted client
              if (selected?.id === toDelete.id) setSheetOpen(false)
            },
            onSettled: () => setToDelete(null),
          })
        }
      />
    </>
  )
}
