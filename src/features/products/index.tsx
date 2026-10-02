import { useState } from 'react'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Ban,
  CheckCircle2,
  ImageOff,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCw,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { apiUrl } from '@/lib/api-client'
import { getErrorMessage } from '@/lib/handle-server-error'
import { useCan } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { SolidIcon } from '@/components/solid-icon'
import { ThemeSwitch } from '@/components/theme-switch'
import { WithTooltip } from '@/components/with-tooltip'
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

type MenuAction = {
  label: string
  icon: LucideIcon
  /** Background of the icon square */
  color: string
  onSelect: () => void
  disabled?: boolean
  destructive?: boolean
}

/** Purple "…" button that opens the actions of a brand or a product */
function ActionsMenu({
  label,
  title,
  actions,
  size = 'size-8',
}: {
  /** Accessible name, e.g. "Actions for GANZBERG" */
  label: string
  /** Shown at the top of the menu */
  title: string
  actions: (MenuAction | 'separator')[]
  size?: string
}) {
  return (
    <DropdownMenu modal={false}>
      <WithTooltip label='Actions'>
        <DropdownMenuTrigger asChild>
          <Button
            size='icon'
            className={cn(
              size,
              'shrink-0 bg-[#5027F5] text-white hover:bg-[#4119d9]'
            )}
            aria-label={label}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
      </WithTooltip>
      <DropdownMenuContent align='end' className='w-52'>
        <DropdownMenuLabel className='truncate text-xs text-muted-foreground'>
          {title}
        </DropdownMenuLabel>
        {actions.map((action, index) =>
          action === 'separator' ? (
            <DropdownMenuSeparator key={`separator-${index}`} />
          ) : (
            <DropdownMenuItem
              key={action.label}
              disabled={action.disabled}
              variant={action.destructive ? 'destructive' : 'default'}
              onSelect={action.onSelect}
            >
              <SolidIcon icon={action.icon} className={action.color} />
              {action.label}
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Stock form brands and their products: add, edit, logo, order, activate, delete */
export function BrandsProducts() {
  const query = useBrands()
  // View-only users see the catalog without the edit buttons
  const canManage = useCan()('catalog.manage')
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
          {canManage && (
            <Button
              className='bg-[#5027F5] text-white hover:bg-[#4119d9]'
              onClick={() => setBrandDialog('new')}
            >
              <Plus /> Add brand
            </Button>
          )}
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
            {canManage && (
              <Button
                className='bg-[#5027F5] text-white hover:bg-[#4119d9]'
                onClick={() => setBrandDialog('new')}
              >
                <Plus /> Add brand
              </Button>
            )}
          </div>
        ) : (
          <div className='grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3'>
            {brands.map((brand, brandIndex) => (
              <section
                key={brand.id}
                className={cn(
                  'flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm',
                  !brand.isActive && 'opacity-70'
                )}
                aria-label={brand.name}
              >
                {/* Brand: logo, names, the fields its stock step asks for */}
                <div className='flex items-start gap-3 p-4'>
                  <BrandLogo brand={brand} />
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-start justify-between gap-2'>
                      <h3 className='truncate text-base leading-tight font-semibold'>
                        {brand.name}
                      </h3>
                      <div className='flex shrink-0 items-center gap-2'>
                        <Badge className='bg-[#5027F5] text-white'>
                          Step {brandIndex + 1}
                        </Badge>
                        {canManage && (
                          <ActionsMenu
                            label={`Actions for ${brand.name}`}
                            title={brand.name}
                            actions={[
                              {
                                label: 'Move up',
                                icon: ArrowUp,
                                color: 'bg-slate-600',
                                disabled: busy || brandIndex === 0,
                                onSelect: () =>
                                  moveBrand.mutate({
                                    id: brand.id,
                                    direction: 'up',
                                  }),
                              },
                              {
                                label: 'Move down',
                                icon: ArrowDown,
                                color: 'bg-slate-600',
                                disabled:
                                  busy || brandIndex === brands.length - 1,
                                onSelect: () =>
                                  moveBrand.mutate({
                                    id: brand.id,
                                    direction: 'down',
                                  }),
                              },
                              {
                                label: 'Edit brand',
                                icon: Pencil,
                                color: 'bg-amber-500',
                                onSelect: () => setBrandDialog(brand),
                              },
                              {
                                label: 'Add product',
                                icon: Plus,
                                color: 'bg-[#5027F5]',
                                onSelect: () =>
                                  setProductTarget({ brand, product: null }),
                              },
                              {
                                label: brand.isActive
                                  ? 'Deactivate'
                                  : 'Activate',
                                icon: brand.isActive ? Ban : CheckCircle2,
                                color: brand.isActive
                                  ? 'bg-sky-600'
                                  : 'bg-emerald-600',
                                disabled: toggleBrand.isPending,
                                onSelect: () =>
                                  toggleBrand.mutate({
                                    id: brand.id,
                                    isActive: !brand.isActive,
                                  }),
                              },
                              'separator',
                              {
                                label: 'Delete brand',
                                icon: Trash2,
                                color: 'bg-red-600',
                                destructive: true,
                                onSelect: () =>
                                  setToDelete({ kind: 'brand', brand }),
                              },
                            ]}
                          />
                        )}
                      </div>
                    </div>
                    {brand.nameKh && (
                      <p className='truncate text-sm text-muted-foreground'>
                        {brand.nameKh}
                      </p>
                    )}
                    <div className='mt-1.5'>
                      <StatusBadge active={brand.isActive} />
                    </div>
                  </div>
                </div>

                <div className='flex flex-wrap gap-1 px-4'>
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

                {/* Products, in form order */}
                <div className='flex-1 p-4'>
                  <p className='mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                    Products · {brand.products.length}
                  </p>
                  {brand.products.length === 0 ? (
                    <p className='rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground'>
                      No products yet. A brand needs at least one active product
                      to appear on the stock form.
                    </p>
                  ) : (
                    <ul className='divide-y overflow-hidden rounded-lg border'>
                      {brand.products.map((product, index) => (
                        <li
                          key={product.id}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2',
                            !product.isActive &&
                              'bg-muted/40 text-muted-foreground'
                          )}
                        >
                          <span className='flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums'>
                            {index + 1}
                          </span>
                          <span className='min-w-0 flex-1'>
                            <span className='block truncate text-sm font-medium'>
                              {product.name}
                            </span>
                            {product.shortName && (
                              <span className='block truncate text-xs text-muted-foreground'>
                                Dashboard: {product.shortName}
                              </span>
                            )}
                            {!product.isActive && (
                              <span className='text-xs'>Inactive</span>
                            )}
                          </span>
                          {canManage && (
                            <ActionsMenu
                              size='size-7'
                              label={`Actions for ${product.name}`}
                              title={product.name}
                              actions={[
                                {
                                  label: 'Move up',
                                  icon: ArrowUp,
                                  color: 'bg-slate-600',
                                  disabled: busy || index === 0,
                                  onSelect: () =>
                                    moveProduct.mutate({
                                      id: product.id,
                                      direction: 'up',
                                    }),
                                },
                                {
                                  label: 'Move down',
                                  icon: ArrowDown,
                                  color: 'bg-slate-600',
                                  disabled:
                                    busy || index === brand.products.length - 1,
                                  onSelect: () =>
                                    moveProduct.mutate({
                                      id: product.id,
                                      direction: 'down',
                                    }),
                                },
                                {
                                  label: 'Edit',
                                  icon: Pencil,
                                  color: 'bg-amber-500',
                                  onSelect: () =>
                                    setProductTarget({ brand, product }),
                                },
                                {
                                  label: product.isActive
                                    ? 'Deactivate'
                                    : 'Activate',
                                  icon: product.isActive ? Ban : CheckCircle2,
                                  color: product.isActive
                                    ? 'bg-sky-600'
                                    : 'bg-emerald-600',
                                  disabled: toggleProduct.isPending,
                                  onSelect: () =>
                                    toggleProduct.mutate({
                                      id: product.id,
                                      isActive: !product.isActive,
                                    }),
                                },
                                'separator',
                                {
                                  label: 'Delete',
                                  icon: Trash2,
                                  color: 'bg-red-600',
                                  destructive: true,
                                  onSelect: () =>
                                    setToDelete({
                                      kind: 'product',
                                      product,
                                      brand,
                                    }),
                                },
                              ]}
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {canManage && (
                  <div className='border-t bg-muted/30 px-4 py-3'>
                    <Button
                      size='sm'
                      className='w-full bg-[#5027F5] text-white hover:bg-[#4119d9]'
                      onClick={() => setProductTarget({ brand, product: null })}
                      aria-label={`Add product to ${brand.name}`}
                    >
                      <Plus /> Add product
                    </Button>
                  </div>
                )}
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
