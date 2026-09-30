import { useState } from 'react'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Ban,
  CheckCircle2,
  ImageOff,
  Pencil,
  Plus,
  RotateCw,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { apiUrl } from '@/lib/api-client'
import { getErrorMessage } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { ActionButton } from '@/features/clients/components/action-button'
import { BrandDialog } from './components/brand-dialog'
import { ProductDialog, type ProductTarget } from './components/product-dialog'
import {
  type AdminBrand,
  type AdminProduct,
  useBrands,
  useDeleteBrand,
  useDeleteProduct,
  useMoveBrand,
  useMoveProduct,
  useToggleBrand,
  useToggleProduct,
} from './data/api'

type ToDelete =
  | { kind: 'brand'; brand: AdminBrand }
  | { kind: 'product'; product: AdminProduct; brand: AdminBrand }
  | null

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge className='bg-emerald-600 text-white'>Active</Badge>
  ) : (
    <Badge variant='outline'>Inactive</Badge>
  )
}

function BrandLogo({ brand }: { brand: AdminBrand }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className='flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white'>
      {brand.logoUrl && !failed ? (
        <img
          src={apiUrl(brand.logoUrl)}
          alt={`${brand.name} logo`}
          className='size-full object-contain p-1'
          onError={() => setFailed(true)}
        />
      ) : (
        <ImageOff className='size-5 text-muted-foreground' />
      )}
    </div>
  )
}

/** Stock form brands and their products: add, edit, logo, order, activate, delete */
export function BrandsProducts() {
  const query = useBrands()
  const brands = query.data?.brands ?? []
  const measures = query.data?.measures ?? []
  const measureLabel = new Map(measures.map((m) => [m.key, m.kh]))

  const [brandDialog, setBrandDialog] = useState<AdminBrand | 'new' | null>(
    null
  )
  const [productTarget, setProductTarget] = useState<ProductTarget>(null)
  const [toDelete, setToDelete] = useState<ToDelete>(null)

  const moveBrand = useMoveBrand()
  const toggleBrand = useToggleBrand()
  const deleteBrand = useDeleteBrand()
  const moveProduct = useMoveProduct()
  const toggleProduct = useToggleProduct()
  const deleteProduct = useDeleteProduct()
  const busy = moveBrand.isPending || moveProduct.isPending

  const saved = (close: () => void) => (message: string) => {
    toast.success(message)
    close()
  }

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
            <h2 className='text-2xl font-bold tracking-tight'>
              Brands &amp; Products
            </h2>
            <p className='text-muted-foreground'>
              The brands, logos and products asked for on the stock form, in
              form order
            </p>
          </div>
          <Button
            className='bg-[#5027F5] text-white hover:bg-[#4119d9]'
            onClick={() => setBrandDialog('new')}
          >
            <Plus /> Add brand
          </Button>
        </div>

        {query.isPending ? (
          <div className='grid gap-4'>
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className='h-44 w-full' />
            ))}
          </div>
        ) : query.isError ? (
          <div className='flex flex-col items-center gap-2 rounded-md border border-dashed p-8 text-sm'>
            <AlertCircle className='size-5 text-destructive' />
            {getErrorMessage(query.error, 'Unable to load brands.')}
            <Button variant='outline' size='sm' onClick={() => query.refetch()}>
              <RotateCw /> Retry
            </Button>
          </div>
        ) : brands.length === 0 ? (
          <div className='flex flex-col items-center gap-3 rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground'>
            No brands yet. Add a brand, then its products; each brand becomes
            one step of the stock form.
            <Button
              className='bg-[#5027F5] text-white hover:bg-[#4119d9]'
              onClick={() => setBrandDialog('new')}
            >
              <Plus /> Add brand
            </Button>
          </div>
        ) : (
          <div className='grid gap-4'>
            {brands.map((brand, brandIndex) => (
              <section
                key={brand.id}
                className={cn(
                  'overflow-hidden rounded-md border',
                  !brand.isActive && 'opacity-70'
                )}
                aria-label={brand.name}
              >
                <div className='flex flex-wrap items-center gap-4 bg-muted/40 p-4'>
                  <BrandLogo brand={brand} />
                  <div className='min-w-0 flex-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <h3 className='text-base font-semibold'>
                        <span className='me-1 text-muted-foreground tabular-nums'>
                          {brandIndex + 1}.
                        </span>
                        {brand.name}
                      </h3>
                      <StatusBadge active={brand.isActive} />
                    </div>
                    {brand.nameKh && (
                      <p className='text-sm text-muted-foreground'>
                        {brand.nameKh}
                      </p>
                    )}
                    <div className='mt-1.5 flex flex-wrap gap-1'>
                      {brand.measures.map((key) => (
                        <Badge
                          key={key}
                          variant='secondary'
                          className='font-normal'
                        >
                          {measureLabel.get(key) ?? key}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className='flex flex-wrap gap-1.5'>
                    <ActionButton
                      label={`Move ${brand.name} up`}
                      tooltip='Move up'
                      className='bg-slate-600 hover:bg-slate-700'
                      disabled={busy || brandIndex === 0}
                      onClick={() =>
                        moveBrand.mutate({ id: brand.id, direction: 'up' })
                      }
                    >
                      <ArrowUp />
                    </ActionButton>
                    <ActionButton
                      label={`Move ${brand.name} down`}
                      tooltip='Move down'
                      className='bg-slate-600 hover:bg-slate-700'
                      disabled={busy || brandIndex === brands.length - 1}
                      onClick={() =>
                        moveBrand.mutate({ id: brand.id, direction: 'down' })
                      }
                    >
                      <ArrowDown />
                    </ActionButton>
                    <ActionButton
                      label={`Edit ${brand.name}`}
                      tooltip='Edit'
                      className='bg-amber-500 hover:bg-amber-600'
                      onClick={() => setBrandDialog(brand)}
                    >
                      <Pencil />
                    </ActionButton>
                    <ActionButton
                      label={`${brand.isActive ? 'Deactivate' : 'Activate'} ${brand.name}`}
                      tooltip={brand.isActive ? 'Deactivate' : 'Activate'}
                      className={
                        brand.isActive
                          ? 'bg-sky-600 hover:bg-sky-700'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      }
                      disabled={toggleBrand.isPending}
                      onClick={() =>
                        toggleBrand.mutate({
                          id: brand.id,
                          isActive: !brand.isActive,
                        })
                      }
                    >
                      {brand.isActive ? <Ban /> : <CheckCircle2 />}
                    </ActionButton>
                    <ActionButton
                      label={`Delete ${brand.name}`}
                      tooltip='Delete'
                      className='bg-red-600 hover:bg-red-700'
                      onClick={() => setToDelete({ kind: 'brand', brand })}
                    >
                      <Trash2 />
                    </ActionButton>
                  </div>
                </div>

                <div className='overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead className='border-y bg-muted/20 text-xs text-muted-foreground'>
                      <tr>
                        <th className='w-12 px-4 py-2 text-start font-medium'>
                          #
                        </th>
                        <th className='px-4 py-2 text-start font-medium'>
                          Product
                        </th>
                        <th className='px-4 py-2 text-start font-medium'>
                          Status
                        </th>
                        <th className='px-4 py-2 text-end font-medium'>
                          <span className='sr-only'>Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {brand.products.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className='px-4 py-4 text-center text-muted-foreground'
                          >
                            No products yet. A brand needs at least one active
                            product to appear on the stock form.
                          </td>
                        </tr>
                      )}
                      {brand.products.map((product, index) => (
                        <tr
                          key={product.id}
                          className={cn(
                            'border-b last:border-b-0',
                            !product.isActive && 'text-muted-foreground'
                          )}
                        >
                          <td className='px-4 py-2 tabular-nums'>
                            {index + 1}
                          </td>
                          <td className='px-4 py-2 font-medium'>
                            {product.name}
                          </td>
                          <td className='px-4 py-2'>
                            <StatusBadge active={product.isActive} />
                          </td>
                          <td className='px-4 py-2'>
                            <div className='flex justify-end gap-1.5'>
                              <ActionButton
                                label={`Move ${product.name} up`}
                                tooltip='Move up'
                                className='bg-slate-600 hover:bg-slate-700'
                                disabled={busy || index === 0}
                                onClick={() =>
                                  moveProduct.mutate({
                                    id: product.id,
                                    direction: 'up',
                                  })
                                }
                              >
                                <ArrowUp />
                              </ActionButton>
                              <ActionButton
                                label={`Move ${product.name} down`}
                                tooltip='Move down'
                                className='bg-slate-600 hover:bg-slate-700'
                                disabled={
                                  busy || index === brand.products.length - 1
                                }
                                onClick={() =>
                                  moveProduct.mutate({
                                    id: product.id,
                                    direction: 'down',
                                  })
                                }
                              >
                                <ArrowDown />
                              </ActionButton>
                              <ActionButton
                                label={`Edit ${product.name}`}
                                tooltip='Edit'
                                className='bg-amber-500 hover:bg-amber-600'
                                onClick={() =>
                                  setProductTarget({ brand, product })
                                }
                              >
                                <Pencil />
                              </ActionButton>
                              <ActionButton
                                label={`${product.isActive ? 'Deactivate' : 'Activate'} ${product.name}`}
                                tooltip={
                                  product.isActive ? 'Deactivate' : 'Activate'
                                }
                                className={
                                  product.isActive
                                    ? 'bg-sky-600 hover:bg-sky-700'
                                    : 'bg-emerald-600 hover:bg-emerald-700'
                                }
                                disabled={toggleProduct.isPending}
                                onClick={() =>
                                  toggleProduct.mutate({
                                    id: product.id,
                                    isActive: !product.isActive,
                                  })
                                }
                              >
                                {product.isActive ? <Ban /> : <CheckCircle2 />}
                              </ActionButton>
                              <ActionButton
                                label={`Delete ${product.name}`}
                                tooltip='Delete'
                                className='bg-red-600 hover:bg-red-700'
                                onClick={() =>
                                  setToDelete({
                                    kind: 'product',
                                    product,
                                    brand,
                                  })
                                }
                              >
                                <Trash2 />
                              </ActionButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className='border-t px-4 py-2'>
                  <Button
                    size='sm'
                    className='bg-[#5027F5] text-white hover:bg-[#4119d9]'
                    onClick={() => setProductTarget({ brand, product: null })}
                  >
                    <Plus /> Add product to {brand.name}
                  </Button>
                </div>
              </section>
            ))}
          </div>
        )}
      </Main>

      <BrandDialog
        brand={brandDialog}
        measures={measures}
        onOpenChange={(open) => !open && setBrandDialog(null)}
        onSaved={saved(() => setBrandDialog(null))}
      />
      <ProductDialog
        target={productTarget}
        onOpenChange={(open) => !open && setProductTarget(null)}
        onSaved={saved(() => setProductTarget(null))}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) =>
          !open &&
          !deleteBrand.isPending &&
          !deleteProduct.isPending &&
          setToDelete(null)
        }
        title={
          toDelete?.kind === 'brand'
            ? `Delete "${toDelete.brand.name}"?`
            : `Delete "${toDelete?.product.name}"?`
        }
        desc={
          toDelete?.kind === 'brand'
            ? `The brand, its ${toDelete.brand.products.length} product(s) and its logo are deleted and it leaves the stock form. Existing stock reports keep their names. To hide it without deleting, deactivate it instead.`
            : 'The product leaves the stock form. Existing stock reports keep its name. To hide it without deleting, deactivate it instead.'
        }
        confirmText='Delete'
        destructive
        isLoading={deleteBrand.isPending || deleteProduct.isPending}
        handleConfirm={() => {
          if (!toDelete) return
          const done = { onSettled: () => setToDelete(null) }
          if (toDelete.kind === 'brand')
            deleteBrand.mutate(toDelete.brand.id, done)
          else deleteProduct.mutate(toDelete.product.id, done)
        }}
      />
    </>
  )
}
