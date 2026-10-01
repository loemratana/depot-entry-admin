import { cn } from '@/lib/utils'
import { type Measure, type StockReport } from '../data/api'

/**
 * Stock of one report: one small table per brand, with only the quantities that brand
 * counts as columns (wedding beer: cases only). Fields a brand does not allow
 * are not shown at all.
 *
 * `flush`: square tables stacked edge to edge with no padding, for filling a
 * table cell (the Stock expanded row). Otherwise separate rounded tables.
 */
export function BrandStockTables({
  items,
  measures,
  className,
  flush = false,
}: {
  items: StockReport['items']
  /** Every quantity, in display order; each brand shows only its own */
  measures: Measure[]
  className?: string
  flush?: boolean
}) {
  // Brands in report order, each with its products
  const brands = new Map<string, StockReport['items']>()
  for (const item of items) {
    brands.set(item.brandName, [...(brands.get(item.brandName) ?? []), item])
  }

  return (
    <div
      className={cn(
        'grid bg-background',
        flush ? 'divide-y' : 'gap-3 p-3',
        className
      )}
    >
      {[...brands.entries()].map(([brandName, brandItems]) => {
        // The brand's fields, in the usual order
        const allowed = measures.filter((m) =>
          brandItems.some((item) => item.measures.includes(m.key))
        )
        return (
          <div
            key={brandName}
            className={cn('overflow-x-auto', !flush && 'rounded-md border')}
          >
            <table className='w-full text-sm'>
              <thead className='bg-[#5027F5] text-xs text-white'>
                <tr>
                  <th className='px-3 py-2 text-start font-semibold'>
                    {brandName}
                  </th>
                  {allowed.map((m) => (
                    <th
                      key={m.key}
                      className='px-3 py-2 text-end font-medium whitespace-nowrap'
                    >
                      {m.kh}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {brandItems.map((item) => (
                  <tr key={item.productId} className='border-t'>
                    <td className='px-3 py-2 font-medium'>
                      {item.productName}
                    </td>
                    {allowed.map((m) => (
                      <td
                        key={m.key}
                        className={cn(
                          'px-3 py-2 text-end tabular-nums',
                          item[m.key] > 0
                            ? 'font-semibold'
                            : 'text-muted-foreground'
                        )}
                      >
                        {item.measures.includes(m.key)
                          ? item[m.key].toLocaleString()
                          : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
