import { useEffect, useRef, useState } from 'react'
import { BarChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useTheme } from '@/context/theme-provider'
import { type ProvinceStock } from '../data/api'

// Only the parts this chart uses, to keep the page small
echarts.use([
  BarChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
])

// One colour per product, in stock-form order (same family as the dashboard cards)
const COLORS = [
  '#0284c7',
  '#d97706',
  '#e11d48',
  '#7c3aed',
  '#0d9488',
  '#ea580c',
  '#4f46e5',
  '#c026d3',
  '#0e7490',
  '#4d7c0f',
]

const ROW_HEIGHT = 38

// Canvas text cannot use CSS "inherit": name the fonts the page loads (index.html),
// with Noto Sans Khmer for Khmer province names
const FONT = "Inter, 'Noto Sans Khmer', 'Khmer OS Battambang', sans-serif"

/**
 * Stacked horizontal bars: one bar per province (largest at the top), one
 * segment per product, the province total at the end of each bar.
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
    Promise.all([
      document.fonts.load("13px 'Noto Sans Khmer'", 'ខេត្ត'),
      document.fonts.load('13px Inter', 'Total'),
    ])
      .catch(() => undefined)
      .finally(() => !cancelled && setFontsReady(true))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ref.current || !fontsReady) return
    const chart = echarts.init(ref.current, undefined, { renderer: 'canvas' })
    const text = dark ? '#e5e7eb' : '#1f2937'
    const muted = dark ? '#9ca3af' : '#6b7280'
    const line = dark ? '#374151' : '#e5e7eb'
    // Largest province at the top: ECharts draws the first category at the bottom
    const provinces = [...data.provinces].reverse()
    const label = (p: ProvinceStock['provinces'][number]) =>
      p.nameEn ? `${p.nameKh} (${p.nameEn})` : p.nameKh

    chart.setOption({
      color: COLORS,
      textStyle: { fontFamily: FONT },
      legend: {
        top: 0,
        // Products only, not the hidden "Total" series
        data: data.products.map((product) => product.shortName),
        type: 'scroll',
        textStyle: { color: text, fontFamily: FONT, fontSize: 12 },
        pageTextStyle: { color: muted },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        textStyle: { fontFamily: FONT },
        valueFormatter: (value: number) => value.toLocaleString(),
      },
      grid: { left: 8, right: 64, top: 44, bottom: 8, containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { color: muted },
        splitLine: { lineStyle: { color: line } },
      },
      yAxis: {
        type: 'category',
        data: provinces.map(label),
        axisLabel: {
          color: text,
          fontFamily: FONT,
          fontSize: 13,
          lineHeight: 20,
          width: 220,
          overflow: 'truncate',
        },
        axisLine: { lineStyle: { color: line } },
        axisTick: { show: false },
      },
      series: [
        ...data.products.map((product, index) => ({
          name: product.shortName,
          type: 'bar',
          stack: 'total',
          barMaxWidth: 22,
          emphasis: { focus: 'series' },
          data: provinces.map((p) => p.cases[index]),
        })),
        // Invisible series that prints the province total at the end of each bar
        {
          name: 'Total',
          type: 'bar',
          stack: 'total',
          data: provinces.map(() => 0),
          itemStyle: { color: 'transparent' },
          tooltip: { show: false },
          label: {
            show: true,
            position: 'right',
            color: text,
            fontWeight: 600,
            formatter: ({ dataIndex }: { dataIndex: number }) =>
              provinces[dataIndex].total.toLocaleString(),
          },
        },
      ],
    })

    const resize = new ResizeObserver(() => chart.resize())
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
