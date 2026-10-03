import { useEffect, useRef, useState } from 'react'
import { useTheme } from '@/context/theme-provider'
import { type ProvinceStock } from '../data/api'
import {
  drawProvinceChart,
  echarts,
  loadChartFonts,
} from '../lib/province-chart'

const ROW_HEIGHT = 38

/**
 * Stacked horizontal bars: one bar per province (largest at the top), one
 * segment per product, the province total at the end of each bar.
 *
 * Every segment of 10 cases or more shows its number inside: segments too
 * narrow for their number are widened just enough to hold it (9px). Numbers,
 * tooltips and totals always show the real cases; because widths are then not
 * strictly to scale, the x-axis scale is not shown.
 */
export function ProvinceStockChart({ data }: { data: ProvinceStock }) {
  const ref = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  const height = Math.max(240, data.provinces.length * ROW_HEIGHT + 110)

  // Draw only once the Khmer font has loaded, or labels render in a fallback font
  const [fontsReady, setFontsReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    loadChartFonts().finally(() => !cancelled && setFontsReady(true))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ref.current || !fontsReady) return
    const chart = echarts.init(ref.current, undefined, { renderer: 'canvas' })
    const relayout = drawProvinceChart(chart, data, dark)
    relayout()

    const resize = new ResizeObserver(() => {
      chart.resize()
      relayout()
    })
    resize.observe(ref.current)
    return () => {
      resize.disconnect()
      chart.dispose()
    }
  }, [data, dark, fontsReady])

  return (
    <div
      ref={ref}
      role='img'
      aria-label='Stock cases per province, stacked by product'
      style={{ height }}
      className='w-full'
    />
  )
}
