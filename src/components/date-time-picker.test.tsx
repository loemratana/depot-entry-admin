import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import {
  FILTER_DATE_PATTERN,
  formatFilterDate,
  isFilterRangeValid,
  joinFilterDate,
  splitFilterDate,
} from '@/features/clients/lib/format'
import { DateTimePicker } from './date-time-picker'

describe('date filter values', () => {
  it('a day, or a day and time', () => {
    expect(FILTER_DATE_PATTERN.test('2026-10-05')).toBe(true)
    expect(FILTER_DATE_PATTERN.test('2026-10-05T08:30')).toBe(true)
    expect(FILTER_DATE_PATTERN.test('2026-10-05T24:00')).toBe(false)
    expect(FILTER_DATE_PATTERN.test('2026-10-05T8:30')).toBe(false)
    expect(splitFilterDate('2026-10-05T08:30').time).toBe('08:30')
    expect(joinFilterDate(new Date(2026, 9, 5), '17:45')).toBe(
      '2026-10-05T17:45'
    )
    expect(joinFilterDate(new Date(2026, 9, 5))).toBe('2026-10-05')
    expect(formatFilterDate('2026-10-03T19:17')).toBe('3 Oct 2026 · 7:17 PM')
    expect(formatFilterDate('2026-10-05')).toBe('5 Oct 2026')
  })

  it('a day alone counts as the whole day when comparing a range', () => {
    expect(isFilterRangeValid('2026-10-05T09:00', '2026-10-05')).toBe(true)
    expect(isFilterRangeValid('2026-10-05', '2026-10-05T09:00')).toBe(true)
    expect(isFilterRangeValid('2026-10-05T10:00', '2026-10-05T09:00')).toBe(
      false
    )
    expect(isFilterRangeValid('2026-10-06', '2026-10-05T23:59')).toBe(false)
  })
})

function Harness({ initial, min }: { initial?: string; min?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <DateTimePicker
        value={value}
        onChange={setValue}
        min={min}
        aria-label='To date'
      />
      <output data-testid='value'>{value ?? ''}</output>
    </>
  )
}

describe('DateTimePicker', () => {
  it('adds a time to the chosen day, and clears it again', async () => {
    const screen = await render(<Harness initial='2026-10-01' />)
    await expect
      .element(screen.getByRole('button', { name: 'To date' }))
      .toHaveTextContent('1 Oct 2026')
    await userEvent.click(screen.getByRole('button', { name: 'To date' }))
    await userEvent.fill(screen.getByLabelText('To date time'), '17:45')
    await expect
      .element(screen.getByTestId('value'))
      .toHaveTextContent('2026-10-01T17:45')
    await expect
      .element(screen.getByRole('button', { name: 'To date' }))
      .toHaveTextContent('1 Oct 2026 · 5:45 PM')
    await userEvent.click(screen.getByRole('button', { name: /Clear time/ }))
    await expect
      .element(screen.getByTestId('value'))
      .toHaveTextContent(/^2026-10-01$/)
  })

  it('the time box waits for a day', async () => {
    const screen = await render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'To date' }))
    await expect.element(screen.getByLabelText('To date time')).toBeDisabled()
    await expect
      .element(screen.getByText(/Pick a day first/))
      .toBeInTheDocument()
  })

  it('on the same day as the start, the end cannot be earlier than it', async () => {
    const screen = await render(
      <Harness initial='2026-10-01' min='2026-10-01T09:00' />
    )
    await userEvent.click(screen.getByRole('button', { name: 'To date' }))
    await userEvent.fill(screen.getByLabelText('To date time'), '08:00')
    await expect
      .element(screen.getByTestId('value'))
      .toHaveTextContent('2026-10-01T09:00')
  })
})
