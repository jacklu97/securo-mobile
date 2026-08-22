import { CircleHelp } from 'lucide-react'
import { ICON_MAP, isEmoji } from '../lib/category-icons'

interface CategoryIconProps {
  icon: string | null | undefined
  color: string | null | undefined
  size?: number
}

/** Mirrors securo's CategoryIcon: DB stores lucide icon names, old data may hold emoji. */
export function CategoryIcon({ icon, color, size = 36 }: CategoryIconProps) {
  const iconStr = icon || 'circle-help'
  const style = {
    backgroundColor: color || '#6B7280',
    width: size,
    height: size,
  }

  if (isEmoji(iconStr)) {
    return (
      <span className="flex shrink-0 items-center justify-center rounded-full" style={style}>
        <span style={{ fontSize: size * 0.5, lineHeight: 1 }}>{iconStr}</span>
      </span>
    )
  }

  const LucideIcon = ICON_MAP[iconStr] ?? CircleHelp
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full" style={style}>
      <LucideIcon size={size * 0.5} className="text-white" strokeWidth={2} />
    </span>
  )
}
