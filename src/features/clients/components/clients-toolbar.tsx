import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/date-picker'
import { useCommunes, useDistricts, useProvinces } from '../data/queries'
import { type ClientFilters, type LocationOption } from '../data/schema'
import { fromIsoDate, toIsoDate } from '../lib/format'
import { type ComboboxOption, FilterCombobox } from './filter-combobox'

const SEARCH_DEBOUNCE_MS = 400

type ClientsToolbarProps = {
  filters: ClientFilters
  onFiltersChange: (patch: Partial<ClientFilters>) => void
  onClear: () => void
}

const toLocationOptions = (items: LocationOption[] | undefined) =>
  items?.map<ComboboxOption>((item) => ({
    value: item.id,
    label: item.nameEn || item.nameKh,
    description: item.nameEn && item.nameKh ? item.nameKh : undefined,
  }))

export function ClientsToolbar({
  filters,
  onFiltersChange,
  onClear,
}: ClientsToolbarProps) {
  const { provinceId, districtId, communeId } = filters

  const provinces = useProvinces()
  const districts = useDistricts(provinceId)
  const communes = useCommunes(districtId, provinceId)

  const provinceOptions = useMemo(
    () => toLocationOptions(provinces.data),
    [provinces.data]
  )
  const districtOptions = useMemo(
    () => toLocationOptions(districts.data),
    [districts.data]
  )
  const communeOptions = useMemo(
    () => toLocationOptions(communes.data),
    [communes.data]
  )

  /* Debounced search: the input is local, the URL is updated after typing pauses */
  const urlSearch = filters.search ?? ''
  const [searchInput, setSearchInput] = useState(urlSearch)
  const lastSyncedSearch = useRef(urlSearch)

  // Pick up external changes (clear filters, back/forward navigation)
  useEffect(() => {
    if (urlSearch !== lastSyncedSearch.current) {
      lastSyncedSearch.current = urlSearch
      setSearchInput(urlSearch)
    }
  }, [urlSearch])

  useEffect(() => {
    const next = searchInput.trim()
    if (next === lastSyncedSearch.current) return
    const timeout = setTimeout(() => {
      lastSyncedSearch.current = next
      onFiltersChange({ search: next || undefined })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [searchInput, onFiltersChange])

  const dateFrom = fromIsoDate(filters.dateFrom)
  const dateTo = fromIsoDate(filters.dateTo)

  const hasActiveFilters = Object.values(filters).some(Boolean) || !!searchInput

  return (
    <div className='flex flex-col gap-3'>
      <div className='relative'>
        <Search className='pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          type='search'
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onKeyDown={(event) => {
            // Enter searches immediately without waiting for the debounce
            if (event.key === 'Enter') {
              const next = searchInput.trim()
              lastSyncedSearch.current = next
              onFiltersChange({ search: next || undefined })
            }
          }}
          placeholder='Search name, phone, or submission no...'
          aria-label='Search outlets'
          maxLength={100}
          className='ps-9'
        />
      </div>

      <div className='grid grid-cols-1 gap-2 @xl/content:grid-cols-3'>
        <FilterCombobox
          label='Province'
          allLabel='All provinces'
          searchPlaceholder='Search province...'
          options={provinceOptions}
          value={provinceId}
          isLoading={provinces.isLoading}
          isError={provinces.isError}
          onChange={(value) =>
            onFiltersChange({
              provinceId: value,
              districtId: undefined,
              communeId: undefined,
            })
          }
        />
        <FilterCombobox
          label='District'
          allLabel='All districts'
          searchPlaceholder='Search district...'
          options={districtOptions}
          value={districtId}
          disabled={!provinceId}
          disabledHint='Select a province first'
          isLoading={districts.isLoading}
          isError={districts.isError}
          onChange={(value) =>
            onFiltersChange({ districtId: value, communeId: undefined })
          }
        />
        <FilterCombobox
          label='Commune'
          allLabel='All communes'
          searchPlaceholder='Search commune...'
          options={communeOptions}
          value={communeId}
          disabled={!districtId}
          disabledHint='Select a district first'
          isLoading={communes.isLoading}
          isError={communes.isError}
          onChange={(value) => onFiltersChange({ communeId: value })}
        />
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        <div className='grid flex-1 grid-cols-2 gap-2 @xl/content:flex @xl/content:flex-none'>
          <DatePicker
            selected={dateFrom}
            onSelect={(date) => onFiltersChange({ dateFrom: toIsoDate(date) })}
            isDateDisabled={(date) => !!dateTo && date > dateTo}
            placeholder='From date'
            aria-label='From date'
            className='w-full @xl/content:w-44'
          />
          <DatePicker
            selected={dateTo}
            onSelect={(date) => onFiltersChange({ dateTo: toIsoDate(date) })}
            isDateDisabled={(date) => !!dateFrom && date < dateFrom}
            placeholder='To date'
            aria-label='To date'
            className='w-full @xl/content:w-44'
          />
        </div>
        <Button
          variant='ghost'
          onClick={() => {
            lastSyncedSearch.current = ''
            setSearchInput('')
            onClear()
          }}
          disabled={!hasActiveFilters}
          className='ms-auto'
        >
          <X />
          Clear filters
        </Button>
      </div>
    </div>
  )
}
