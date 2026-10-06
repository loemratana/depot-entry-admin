import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { type StockReport } from '../data/api'
import { OutletStockDialog } from './outlet-stock-dialog'

const mutate = vi.fn()

vi.mock('../data/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../data/api')>()),
  useStockCatalog: () => ({
    isPending: false,
    isError: false,
    data: {
      measures: [
        { key: 'cases', kh: 'ចំនួនកេស', en: 'Cases' },
        { key: 'canRings', kh: 'ចំនួនក្រវិល', en: 'Can rings' },
      ],
      brands: [
        {
          id: 'b1',
          name: 'GANZBERG',
          nameKh: '',
          measures: ['cases', 'canRings'],
          logoUrl: null,
          products: [{ id: 'p1', name: 'Ganzberg Snow' }],
        },
        {
          id: 'b2',
          name: 'WEDDING',
          nameKh: '',
          measures: ['cases'],
          logoUrl: null,
          products: [{ id: 'p2', name: 'Wedding Gold' }],
        },
      ],
    },
  }),
  useSetOutletStock: () => ({ mutate, isPending: false, isError: false }),
}))

const report = {
  id: 'r1',
  outlet: { id: 'o1', name: 'Shop' },
  items: [
    {
      productId: 'p1',
      brandName: 'GANZBERG',
      productName: 'Ganzberg Snow',
      measures: ['cases', 'canRings'],
      cases: 3,
      canRings: 0,
      cashRingsUsd: 0,
      cashRingsKhr: 0,
    },
  ],
} as unknown as StockReport

describe('OutletStockDialog', () => {
  beforeEach(() => mutate.mockReset())

  it('starts from the current stock and saves every product; blank = 0', async () => {
    const screen = await render(
      <OutletStockDialog
        open
        onOpenChange={() => {}}
        outlet={{ id: 'o1', name: 'Shop' }}
        report={report}
      />
    )
    await expect.element(screen.getByText('Edit stock · Shop')).toBeVisible()
    const inputs = screen.getByRole('textbox').elements() as HTMLInputElement[]
    // Snow: cases, can rings; Wedding: cases only
    expect(inputs.map((input) => input.value)).toEqual(['3', '', ''])

    await userEvent.fill(screen.getByRole('textbox').nth(2), '5')
    await userEvent.click(screen.getByRole('button', { name: /Save stock/ }))
    expect(mutate).toHaveBeenCalledOnce()
    expect(mutate.mock.calls[0][0]).toEqual({
      outletId: 'o1',
      stockItems: [
        { productId: 'p1', cases: 3, canRings: 0 },
        { productId: 'p2', cases: 5 },
      ],
    })
  })

  it('with no stock (deleted), it adds it again', async () => {
    const screen = await render(
      <OutletStockDialog
        open
        onOpenChange={() => {}}
        outlet={{ id: 'o1', name: 'Shop' }}
        report={null}
      />
    )
    await expect.element(screen.getByText('Add stock · Shop')).toBeVisible()
  })

  it('refuses anything but a whole number, without saving', async () => {
    const screen = await render(
      <OutletStockDialog
        open
        onOpenChange={() => {}}
        outlet={{ id: 'o1', name: 'Shop' }}
        report={report}
      />
    )
    await userEvent.fill(screen.getByRole('textbox').first(), '2.5')
    await userEvent.click(screen.getByRole('button', { name: /Save stock/ }))
    await expect.element(screen.getByText(/Whole number from 0/)).toBeVisible()
    expect(mutate).not.toHaveBeenCalled()
  })
})
