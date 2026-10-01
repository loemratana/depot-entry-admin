import { useState } from 'react'
import { Check, ChevronsUpDown, Loader2, Plus } from 'lucide-react'
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
import {
  MAX_TYPED_LOCATION,
  MIN_TYPED_LOCATION,
  cleanLocationName,
  locationNameKey,
  toTypedLocation,
  typedLocationName,
} from '../lib/typed-location'

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
  /** Lets the user use what they typed when it is not in the list */
  allowCustom?: boolean
  /** Text of the "use typed name" row */
  customLabel?: (name: string) => string
}

/**
 * Searchable single-select for required fields. Unlike the admin filter
 * combobox it has no "All" entry. With `allowCustom`, a name that is not in
 * the list can be used as typed (value `new:<name>`, see lib/typed-location).
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
  allowCustom,
  customLabel = (name) => `ប្រើ "${name}" · Use "${name}"`,
}: OptionComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const typedName = typedLocationName(value)
  const selected =
    typedName !== null
      ? { value, label: typedName, description: 'បញ្ចូលថ្មី · New' }
      : options?.find((option) => option.value === value)

  const typed = cleanLocationName(search).slice(0, MAX_TYPED_LOCATION)
  const typedKey = locationNameKey(typed)
  const inList = (options ?? []).some(
    (option) =>
      locationNameKey(option.label) === typedKey ||
      locationNameKey(option.description ?? '') === typedKey
  )
  const showCustom =
    allowCustom &&
    !isLoading &&
    !isError &&
    typed.length >= MIN_TYPED_LOCATION &&
    !inList

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setSearch('')
          onBlur?.()
        }
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
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
            maxLength={MAX_TYPED_LOCATION}
          />
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
                {!showCustom && (
                  <CommandEmpty>
                    {allowCustom
                      ? 'រកមិនឃើញ វាយឈ្មោះដើម្បីបញ្ចូលថ្មី · Not found. Type the name to add it.'
                      : 'រកមិនឃើញ · No results found.'}
                  </CommandEmpty>
                )}
                <CommandGroup>
                  {options?.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      keywords={[option.label, option.description ?? '']}
                      onSelect={() => {
                        onChange(option.value)
                        setOpen(false)
                        setSearch('')
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
                {showCustom && (
                  <CommandGroup forceMount>
                    <CommandItem
                      value={`__custom__${typed}`}
                      forceMount
                      onSelect={() => {
                        onChange(toTypedLocation(typed))
                        setOpen(false)
                        setSearch('')
                        onBlur?.()
                      }}
                    >
                      <Plus className='size-4 shrink-0' />
                      <span className='min-w-0 truncate'>
                        {customLabel(typed)}
                      </span>
                    </CommandItem>
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
