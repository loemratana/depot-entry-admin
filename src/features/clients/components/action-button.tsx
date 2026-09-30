import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { WithTooltip } from '@/components/with-tooltip'

/** Small icon button with a solid background colour and a tooltip */
export function ActionButton({
  label,
  tooltip = label,
  className,
  disabled,
  onClick,
  children,
}: {
  /** Accessible name, e.g. "Edit Sokha Shop" */
  label: string
  /** Short text shown on hover, e.g. "Edit"; defaults to the label */
  tooltip?: string
  className: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <WithTooltip label={tooltip} disabled={disabled}>
      <Button
        size='icon'
        className={cn(
          'size-8 text-white shadow-none disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100',
          className
        )}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
      >
        {children}
      </Button>
    </WithTooltip>
  )
}
