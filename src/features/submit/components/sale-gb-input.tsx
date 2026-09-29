import { useId, useMemo, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { useSales } from '@/features/clients/data/queries'
import { saleNameKey } from '../lib/sale-name'

const MAX_SUGGESTIONS = 8

type SaleGbInputProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  /** Text of the "add new" row; receives the typed name */
  newLabel?: (name: string) => string
}

/**
 * Free-text Sale GB field with suggestions from the Sale GB list.
 * A name that is not in the list is allowed; the backend adds it.
 */
export function SaleGbInput({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  invalid,
  newLabel = (name) => `Use "${name}" as a new Sale GB`,
}: SaleGbInputProps) {
  const listId = useId()
  const sales = useSales()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  const typed = value.trim()
  const key = saleNameKey(typed)

  const suggestions = useMemo(() => {
    const all = sales.data ?? []
    const matches = key
      ? all.filter((sale) => saleNameKey(sale.name).includes(key))
      : all
    return matches.slice(0, MAX_SUGGESTIONS)
  }, [sales.data, key])

  const exactMatch = (sales.data ?? []).some(
    (sale) => saleNameKey(sale.name) === key
  )
  const showNew = typed.length >= 2 && !exactMatch
  const options = [
    ...suggestions.map((sale) => ({
      key: sale.id,
      name: sale.name,
      isNew: false,
    })),
    ...(showNew ? [{ key: '__new__', name: typed, isNew: true }] : []),
  ]
  const visible = open && !disabled && options.length > 0

  const pick = (name: string) => {
    onChange(name)
    setOpen(false)
    setActive(-1)
  }

  return (
    <div className='relative'>
      <Input
        id={id}
        role='combobox'
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete='list'
        aria-activedescendant={
          visible && active >= 0 ? `${listId}-${active}` : undefined
        }
        aria-invalid={invalid}
        autoComplete='off'
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false)
          onBlur?.()
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActive((i) => Math.min(i + 1, options.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => Math.max(i - 1, -1))
          } else if (e.key === 'Enter' && visible && active >= 0) {
            e.preventDefault()
            pick(options[active].name)
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      {visible && (
        <ul
          id={listId}
          role='listbox'
          className='absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md'
        >
          {options.map((option, index) => (
            <li
              key={option.key}
              id={`${listId}-${index}`}
              role='option'
              aria-selected={index === active}
              // mousedown keeps focus in the input so onBlur does not close the list first
              onMouseDown={(e) => {
                e.preventDefault()
                pick(option.name)
              }}
              onMouseEnter={() => setActive(index)}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
                index === active && 'bg-accent text-accent-foreground',
                option.isNew && 'text-muted-foreground'
              )}
            >
              {option.isNew ? (
                <Plus className='size-4 shrink-0' />
              ) : (
                <Check
                  className={cn(
                    'size-4 shrink-0',
                    saleNameKey(option.name) === key
                      ? 'opacity-100'
                      : 'opacity-0'
                  )}
                />
              )}
              <span className='min-w-0 truncate'>
                {option.isNew ? newLabel(option.name) : option.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
