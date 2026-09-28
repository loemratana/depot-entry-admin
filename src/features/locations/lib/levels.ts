import { type LocationLevel } from '../data/api'

export const LEVEL_LABEL: Record<LocationLevel, { en: string; kh: string }> = {
  provinces: { en: 'Province', kh: 'ខេត្ត/ក្រុង' },
  districts: { en: 'District', kh: 'ខណ្ឌ/ស្រុក' },
  communes: { en: 'Commune', kh: 'ឃុំ/ភូមិ' },
}
