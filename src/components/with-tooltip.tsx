import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/**
 * Shows `label` in a tooltip when the wrapped button is hovered or focused.
 * The child must forward refs and props (a Button, or a Radix trigger with
 * `asChild`). Disabled buttons get no pointer events, so pass `disabled`
 * to hover a wrapper instead and still explain why it is unavailable.
 */
export function WithTooltip({
  label,
  disabled,
  side = 'top',
  children,
}: {
  label: string
  disabled?: boolean
  side?: 'top' | 'bottom' | 'left' | 'right'
  children: React.ReactElement
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {disabled ? (
          <span tabIndex={0} className='inline-flex rounded-md'>
            {children}
          </span>
        ) : (
          children
        )}
      </TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  )
}
