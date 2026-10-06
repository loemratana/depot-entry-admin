import { format, isSameDay } from 'date-fns'
import { Calendar as CalendarIcon, Clock, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  formatClock,
  isFilterRangeValid,
  joinFilterDate,
  splitFilterDate,
} from '@/features/clients/lib/format'

type DateTimePickerProps = {
  /** `yyyy-MM-dd`, or `yyyy-MM-ddTHH:mm` when a time is set */
  value: string | undefined
  onChange: (value: string | undefined) => void
  /** The start of the range, when this picker is its end */
  min?: string
  /** The end of the range, when this picker is its start */
  max?: string
  placeholder?: string
  className?: string
  'aria-label'?: string
}

/**
 * Date filter with an optional time: pick a day, and optionally a time. Without
 * a time the whole day counts; with one, the range starts (or ends) at that
 * minute. Future days cannot be picked, and the range cannot be turned around.
 */
export function DateTimePicker({
  value,
  onChange,
  min,
  max,
  placeholder = 'Pick a date',
  className,
  'aria-label': ariaLabel,
}: DateTimePickerProps) {
  const { date, time } = splitFilterDate(value)
  const minDay = splitFilterDate(min)
  const maxDay = splitFilterDate(max)

  // Keeps the range the right way round on the same day by moving this time to the limit
  const emit = (next: string | undefined) => {
    if (min && next && !isFilterRangeValid(min, next)) {
      next = joinFilterDate(splitFilterDate(next).date, minDay.time)
    }
    if (max && next && !isFilterRangeValid(next, max)) {
      next = joinFilterDate(splitFilterDate(next).date, maxDay.time)
    }
    onChange(next)
  }

  const sameDayAs = (other: Date | undefined) =>
    !!date && !!other && isSameDay(date, other)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          data-empty={!date}
          aria-label={ariaLabel}
          className={cn(
            'w-60 justify-start text-start font-normal data-[empty=true]:text-muted-foreground',
            className
          )}
        >
          {date ? (
            <span className='truncate'>
              {format(date, 'd MMM yyyy')}
              {time && (
                <span className='tabular-nums'> · {formatClock(time)}</span>
              )}
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
          <CalendarIcon className='ms-auto h-4 w-4 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0'>
        <Calendar
          mode='single'
          captionLayout='dropdown'
          selected={date}
          defaultMonth={date}
          // A new day keeps the chosen time
          onSelect={(day) => emit(joinFilterDate(day, time))}
          disabled={(day: Date) =>
            day > new Date() ||
            day < new Date('1900-01-01') ||
            (!!minDay.date && day < minDay.date) ||
            (!!maxDay.date && day > maxDay.date)
          }
        />
        <div className='grid gap-1.5 border-t p-3'>
          <div className='flex items-center gap-2'>
            <Clock className='size-4 shrink-0 text-muted-foreground' />
            <Input
              type='time'
              step={60}
              value={time}
              disabled={!date}
              min={
                sameDayAs(minDay.date) ? minDay.time || undefined : undefined
              }
              max={
                sameDayAs(maxDay.date) ? maxDay.time || undefined : undefined
              }
              onChange={(e) => emit(joinFilterDate(date, e.target.value))}
              aria-label={`${ariaLabel ?? 'Date'} time`}
              className='h-8 w-32 tabular-nums'
            />
            {time && (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='h-8 px-2'
                onClick={() => emit(joinFilterDate(date))}
              >
                <X />
                Clear time
              </Button>
            )}
          </div>
          <p className='text-xs text-muted-foreground'>
            {date
              ? 'ទុកម៉ោងទទេ សម្រាប់ពេញមួយថ្ងៃ · Leave the time empty for the whole day'
              : 'ជ្រើសរើសថ្ងៃជាមុនសិន · Pick a day first'}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
