import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/** Small icon button with a solid background colour */
export function ActionButton({
  label,
  className,
  disabled,
  onClick,
  children,
}: {
  label: string
  className: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      size='icon'
      className={cn(
        'size-8 text-white shadow-none disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100',
        className
      )}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  )
}
