import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Menu icon on a small solid-colour square (white icon), used in action menus.
 * Size and colour are set on the icon itself, so the menu item's own icon
 * styles (grey, red) do not apply.
 */
export function SolidIcon({
  icon: Icon,
  className,
}: {
  icon: LucideIcon
  /** Background colour, e.g. bg-amber-500 */
  className: string
}) {
  return (
    <span
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-md shadow-sm',
        className
      )}
    >
      <Icon className='size-3.5 text-white' strokeWidth={2.5} />
    </span>
  )
}
