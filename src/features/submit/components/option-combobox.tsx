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

export type Option = {
  value: string
  label: string
  /** Secondary line, e.g. the English name; also searchable */
  description?: string
}

type OptionComboboxProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  options: Option[] | undefined
  placeholder: string
  searchPlaceholder: string
  disabled?: boolean
  isLoading?: boolean
  isError?: boolean
  invalid?: boolean
}

/**
 * Searchable single-select for required fields. Unlike the admin filter
 * combobox it has no "All" entry.
 */
export function OptionCombobox({
  id,
  value,
  onChange,
  onBlur,
  options,
  placeholder,
  searchPlaceholder,
  disabled,
  isLoading,
  isError,
  invalid,
}: OptionComboboxProps) {
  const [open, setOpen] = useState(false)
  const selected = options?.find((option) => option.value === value)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) onBlur?.()
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          aria-invalid={invalid}
          disabled={disabled}
          data-empty={!selected}
          className='h-auto min-h-10 w-full min-w-0 justify-between py-2 text-start font-normal aria-invalid:border-destructive data-[empty=true]:text-muted-foreground'
        >
          <span className='flex min-w-0 flex-col'>
            <span className='truncate'>
              {isLoading && !selected
                ? 'កំពុងផ្ទុក... · Loading...'
                : (selected?.label ?? placeholder)}
            </span>
            {selected?.description && (
              <span className='truncate text-xs text-muted-foreground'>
                {selected.description}
              </span>
            )}
          </span>
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
                មិនអាចផ្ទុកបានទេ · Unable to load options.
              </div>
            ) : (
              <>
                <CommandEmpty>រកមិនឃើញ · No results found.</CommandEmpty>
                <CommandGroup>
                  {options?.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      keywords={[option.label, option.description ?? '']}
                      onSelect={() => {
                        onChange(option.value)
                        setOpen(false)
                        onBlur?.()
                      }}
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
