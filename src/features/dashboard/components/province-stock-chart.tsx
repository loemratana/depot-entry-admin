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
        // Province, its outlets, then each product's cases
        formatter: (
          items: {
            dataIndex: number
            marker: string
            seriesName: string
            value: number
          }[]
        ) => {
          const rows = items.filter((item) => item.seriesName !== 'Total')
          const province = provinces[rows[0]?.dataIndex ?? 0]
          const outlets = `${province.outlets.toLocaleString()} outlet${province.outlets === 1 ? '' : 's'}`
          return [
            `<b>${label(province)}</b>`,
            `<span style="color:${muted}">${outlets} · ${province.total.toLocaleString()} cases</span>`,
            ...rows.map(
              (item) =>
                `${item.marker}${item.seriesName}<span style="float:right;margin-left:16px;font-weight:600">${item.value.toLocaleString()}</span>`
            ),
          ].join('<br/>')
        },
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
        // Outlet count badge in front of each province name
        axisLabel: {
          color: text,
          fontFamily: FONT,
          fontSize: 13,
          lineHeight: 20,
          formatter: (value: string, index: number) =>
            `{outlets|${provinces[index].outlets.toLocaleString()} outlet${provinces[index].outlets === 1 ? '' : 's'}}  {name|${value}}`,
          rich: {
            outlets: {
              color: '#ffffff',
              backgroundColor: '#5027F5',
              borderRadius: 4,
              padding: [3, 6],
              fontFamily: FONT,
              fontSize: 11,
              fontWeight: 600,
            },
            name: {
              color: text,
              fontFamily: FONT,
              fontSize: 13,
              lineHeight: 20,
            },
          },
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
          // The product's cases written inside its coloured segment
          label: {
            position: 'inside',
            color: '#ffffff',
            fontFamily: FONT,
            fontSize: 12,
            fontWeight: 600,
            align: 'center',
            verticalAlign: 'middle',
            // Shown and sized per segment by relayoutLabels()
            show: false,
            // Same text as measured in labelFor(): 1,380 not 1380
            formatter: ({ value }: { value: number }) => value.toLocaleString(),
          },
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

    // A segment's pixel width is only known once the chart has laid out its
    // axis, so measure it, then redraw the labels (and again on every resize)
    let pixelsPerCase = 0
    const measure = document.createElement('canvas').getContext('2d')
    // Largest font that fits the segment with ~3px each side; bars keep their true length
    const LABEL_SIZES = [12, 10, 9]
    const SIDE_PADDING = 3
    const labelFor = (value: number) => {
      if (value <= 0 || !pixelsPerCase || !measure) return { show: false }
      const width = value * pixelsPerCase
      const text = value.toLocaleString()
      for (const fontSize of LABEL_SIZES) {
        measure.font = `600 ${fontSize}px ${FONT}`
        if (measure.measureText(text).width + SIDE_PADDING * 2 <= width)
          return { show: true, fontSize }
      }
      // Does not fit even at 9px: no number (the tooltip still has it)
      return { show: false }
    }
    const relayoutLabels = () => {
      const zero = chart.convertToPixel({ xAxisIndex: 0 }, 0)
      const one = chart.convertToPixel({ xAxisIndex: 0 }, 1)
      const next = Math.abs(one - zero)
      if (next === pixelsPerCase) return
      pixelsPerCase = next
      chart.setOption({
        series: data.products.map((_, index) => ({
          data: provinces.map((p) => ({
            value: p.cases[index],
            label: labelFor(p.cases[index]),
          })),
        })),
      })
    }
    relayoutLabels()

    const resize = new ResizeObserver(() => {
      chart.resize()
      relayoutLabels()
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
