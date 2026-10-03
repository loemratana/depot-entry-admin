import { type ProvinceStock } from '../data/api'
import {
  FONT,
  drawProvinceChart,
  echarts,
  loadChartFonts,
} from './province-chart'

// One A4 landscape page (297 × 210 mm), laid out in CSS pixels and drawn at
// 2× for sharp printing
const PAGE_WIDTH = 1754
const PAGE_HEIGHT = 1240
const SCALE = 2
const MARGIN = 56
const HEADER_HEIGHT = 128
const FOOTER_HEIGHT = 44

type ExportInput = {
  data: ProvinceStock
  /** e.g. "All time" or "2026-10-01 → 2026-10-31" */
  period: string
  /** e.g. "120 outlets · 18 of 25 provinces with stock · 40,776 cases in total" */
  summary: string
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })

/** The chart drawn at the given size, off screen, as a PNG data URL */
async function renderChart(data: ProvinceStock, width: number, height: number) {
  const host = document.createElement('div')
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;height:${height}px;`
  document.body.appendChild(host)
  const chart = echarts.init(host, undefined, {
    renderer: 'canvas',
    devicePixelRatio: SCALE,
  })
  try {
    // No animation, so the picture is the finished chart
    chart.setOption({ animation: false })
    drawProvinceChart(chart, data, false)()
    return chart.getDataURL({
      type: 'png',
      pixelRatio: SCALE,
      backgroundColor: '#ffffff',
    })
  } finally {
    chart.dispose()
    host.remove()
  }
}

/**
 * Builds a one-page A4 landscape PDF of the Stock by Province chart and
 * downloads it. The whole page (title, Khmer province names, chart) is drawn
 * by the browser as one image, because PDF text does not shape Khmer correctly.
 */
export async function exportProvinceStockPdf({
  data,
  period,
  summary,
}: ExportInput) {
  await loadChartFonts()

  const chartWidth = PAGE_WIDTH - MARGIN * 2
  const chartHeight = PAGE_HEIGHT - MARGIN * 2 - HEADER_HEIGHT - FOOTER_HEIGHT
  const chart = await loadImage(
    await renderChart(data, chartWidth, chartHeight)
  )

  const page = document.createElement('canvas')
  page.width = PAGE_WIDTH * SCALE
  page.height = PAGE_HEIGHT * SCALE
  const g = page.getContext('2d')
  if (!g) throw new Error('Canvas is not available')
  g.scale(SCALE, SCALE)
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)

  // Header: title, period, summary; export time on the right
  g.textBaseline = 'top'
  g.fillStyle = '#111827'
  g.font = `700 34px ${FONT}`
  g.fillText('Stock by Province', MARGIN, MARGIN)
  g.fillStyle = '#4b5563'
  g.font = `400 18px ${FONT}`
  g.fillText(
    `ចំនួនកេស (cases) per province, by product · ${period}`,
    MARGIN,
    MARGIN + 48
  )
  g.fillStyle = '#111827'
  g.font = `600 18px ${FONT}`
  g.fillText(summary, MARGIN, MARGIN + 80)

  const exported = `Exported ${new Date().toLocaleString()}`
  g.fillStyle = '#6b7280'
  g.font = `400 14px ${FONT}`
  g.textAlign = 'right'
  g.fillText(exported, PAGE_WIDTH - MARGIN, MARGIN + 8)
  g.textAlign = 'left'

  // The chart
  g.drawImage(chart, MARGIN, MARGIN + HEADER_HEIGHT, chartWidth, chartHeight)

  // Footnote
  g.fillStyle = '#6b7280'
  g.font = `400 13px ${FONT}`
  g.fillText(
    'ចំនួននីមួយៗជាចំនួនពិត · Every number is the real count. Very small segments are drawn a little wider so their number fits; totals at the end of each bar are exact.',
    MARGIN,
    PAGE_HEIGHT - MARGIN - 16
  )

  // Loaded only when someone exports, so the page itself stays light
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  // Compressed PNG keeps text and bars crisp at a small file size
  pdf.addImage(page.toDataURL('image/png'), 'PNG', 0, 0, 297, 210, undefined, 'FAST')
  const date = new Date().toISOString().slice(0, 10)
  pdf.save(`stock-by-province-${date}.pdf`)
}
