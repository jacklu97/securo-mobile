import { useTranslation } from 'react-i18next'
import { Check, X } from 'lucide-react'
import type { Workspace } from '../lib/types'
import { WorkspaceIcon } from './WorkspaceIcon'

const KIND_LABEL: Record<string, string> = {
  personal: 'workspace.kindPersonal',
  business: 'workspace.kindBusiness',
}

const ROLE_LABEL: Record<string, string> = {
  owner: 'workspace.roleOwner',
  editor: 'workspace.roleEditor',
  viewer: 'workspace.roleViewer',
  manager: 'workspace.roleManager',
}

interface WorkspaceSwitcherSheetProps {
  workspaces: Workspace[]
  currentId: string | null
  onSelect: (id: string) => void
  onClose: () => void
}

export function WorkspaceSwitcherSheet({
  workspaces,
  currentId,
  onSelect,
  onClose,
}: WorkspaceSwitcherSheetProps) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t('workspace.switchTitle')}</h2>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="text-muted-foreground">
            <X size={20} />
          </button>
        </div>

        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {workspaces.map((workspace) => {
            const isActive = workspace.id === currentId
            const meta = [
              KIND_LABEL[workspace.kind] ? t(KIND_LABEL[workspace.kind]) : workspace.kind,
              workspace.role ? (ROLE_LABEL[workspace.role] ? t(ROLE_LABEL[workspace.role]) : workspace.role) : null,
            ]
              .filter(Boolean)
              .join(' · ')
            return (
              <li key={workspace.id}>
                <button
                  type="button"
                  onClick={() => onSelect(workspace.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left ${
                    isActive ? 'bg-accent' : ''
                  }`}
                >
                  <WorkspaceIcon workspace={workspace} />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-sm ${
                        isActive ? 'font-medium text-accent-foreground' : 'text-foreground'
                      }`}
                    >
                      {workspace.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">{meta}</span>
                  </span>
                  {isActive && <Check size={16} className="shrink-0 text-accent-foreground" />}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
