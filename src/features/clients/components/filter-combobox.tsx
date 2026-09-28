import { useState } from 'react'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export type ComboboxOption = {
  value: string
  label: string
  /** Secondary text, e.g. the Khmer name; also searchable */
  description?: string
}

type FilterComboboxProps = {
  label: string
  /** Label of the "no filter" option, e.g. "All provinces" */
  allLabel: string
  searchPlaceholder: string
  options: ComboboxOption[] | undefined
  value: string | undefined
  onChange: (value: string | undefined) => void
  disabled?: boolean
  /** Shown in the trigger while disabled, e.g. "Select a province first" */
  disabledHint?: string
  isLoading?: boolean
  isError?: boolean
  className?: string
}

export function FilterCombobox({
  label,
  allLabel,
  searchPlaceholder,
  options,
  value,
  onChange,
  disabled,
  disabledHint,
  isLoading,
  isError,
  className,
}: FilterComboboxProps) {
  const [open, setOpen] = useState(false)
  const selected = options?.find((option) => option.value === value)

  const select = (next: string | undefined) => {
    onChange(next)
    setOpen(false)
  }

  const triggerText = disabled
    ? (disabledHint ?? allLabel)
    : isLoading && value
      ? 'Loading...'
      : (selected?.label ?? allLabel)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          aria-label={label}
          disabled={disabled}
          data-empty={!selected}
          className={cn(
            'w-full justify-between font-normal data-[empty=true]:text-muted-foreground',
            className
          )}
        >
          <span className='truncate'>{triggerText}</span>
          {isLoading ? (
            <Loader2 className='size-4 shrink-0 animate-spin opacity-50' />
          ) : (
            <ChevronsUpDown className='size-4 shrink-0 opacity-50' />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-(--radix-popover-trigger-width) min-w-60 p-0'
        align='start'
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            {isLoading ? (
              <div className='flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground'>
                <Loader2 className='size-4 animate-spin' />
                Loading...
              </div>
            ) : isError ? (
              <div className='py-6 text-center text-sm text-muted-foreground'>
                Unable to load options.
              </div>
            ) : (
              <>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value={`__all__ ${allLabel}`}
                    onSelect={() => select(undefined)}
                  >
                    <Check
                      className={cn(
                        'size-4',
                        value ? 'opacity-0' : 'opacity-100'
                      )}
                    />
                    {allLabel}
                  </CommandItem>
                  {options?.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      keywords={[option.label, option.description ?? '']}
                      onSelect={() => select(option.value)}
                    >
                      <Check
                        className={cn(
                          'size-4 shrink-0',
                          value === option.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className='flex min-w-0 flex-col'>
                        <span>{option.label}</span>
                        {option.description && (
                          <span className='text-xs text-muted-foreground'>
                            {option.description}
                          </span>
                        )}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
