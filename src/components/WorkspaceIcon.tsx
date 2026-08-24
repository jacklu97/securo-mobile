import { Building2, User } from 'lucide-react'
import { ICON_MAP, isEmoji } from '../lib/category-icons'
import type { Workspace } from '../lib/types'

// Mirrors securo's workspace-switcher fallbacks: the workspace's own icon,
// else an icon for its kind, colored with its color (default #6366F1).
const KIND_ICON = { personal: User, business: Building2 } as const

export const WORKSPACE_DEFAULT_COLOR = '#6366F1'

interface WorkspaceIconProps {
  workspace: Workspace
  size?: number
}

export function WorkspaceIcon({ workspace, size = 32 }: WorkspaceIconProps) {
  const color = workspace.color || WORKSPACE_DEFAULT_COLOR
  const style = { backgroundColor: color, width: size, height: size }
  const icon = workspace.icon

  if (icon && isEmoji(icon)) {
    return (
      <span className="flex shrink-0 items-center justify-center rounded-lg" style={style}>
        <span style={{ fontSize: size * 0.5, lineHeight: 1 }}>{icon}</span>
      </span>
    )
  }

  const Icon =
    (icon ? ICON_MAP[icon] : undefined) ??
    KIND_ICON[workspace.kind as keyof typeof KIND_ICON] ??
    Building2
  return (
    <span className="flex shrink-0 items-center justify-center rounded-lg" style={style}>
      <Icon size={size * 0.5} className="text-white" strokeWidth={2} />
    </span>
  )
}
