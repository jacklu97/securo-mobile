import { useEffect, useState } from 'react'
import { Home, List, Plus, Settings } from 'lucide-react'
import { WORKSPACE_STORAGE_KEY } from '../lib/api'
import { listWorkspaces } from '../lib/securo'
import type { DeviceCredentials, Workspace } from '../lib/types'
import { AddTransactionScreen } from './AddTransactionScreen'
import { DashboardScreen } from './DashboardScreen'
import { SettingsScreen } from './SettingsScreen'
import { TransactionsScreen } from './TransactionsScreen'

type Tab = 'home' | 'activity' | 'add' | 'settings'

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'activity', label: 'Activity', icon: List },
  { id: 'add', label: 'Add', icon: Plus },
  { id: 'settings', label: 'Settings', icon: Settings },
]

interface MainShellProps {
  creds: DeviceCredentials
  onUnpaired: () => void
}

export function MainShell({ creds, onUnpaired }: MainShellProps) {
  const [tab, setTab] = useState<Tab>('home')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [workspaceId, setWorkspaceId] = useState<string | null>(
    localStorage.getItem(WORKSPACE_STORAGE_KEY),
  )
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    listWorkspaces()
      .then((list) => {
        const active = list.filter((workspace) => !workspace.is_archived)
        setWorkspaces(active)
        // Adopt the first workspace if none is selected or the stored one is gone.
        if (active.length > 0 && !active.some((workspace) => workspace.id === workspaceId)) {
          selectWorkspace(active[0].id)
        }
      })
      .catch(() => setLoadError(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectWorkspace = (id: string) => {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, id)
    setWorkspaceId(id)
  }

  const workspace = workspaces.find((item) => item.id === workspaceId) ?? null

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-slate-400">
          Could not reach {creds.instanceUrl}. Check the connection and try again.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-accent px-6 py-3 font-semibold text-slate-900"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
      <div className="flex-1 pb-20">
        {tab === 'home' && (
          <DashboardScreen
            workspace={workspace}
            workspaces={workspaces}
            onSelectWorkspace={selectWorkspace}
          />
        )}
        {tab === 'activity' && <TransactionsScreen workspace={workspace} />}
        {tab === 'add' && <AddTransactionScreen workspace={workspace} onSaved={() => setTab('activity')} />}
        {tab === 'settings' && <SettingsScreen creds={creds} onUnpaired={onUnpaired} />}
      </div>

      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-800 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-md">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] ${
                tab === id ? 'text-accent' : 'text-slate-500'
              }`}
            >
              <Icon size={20} strokeWidth={tab === id ? 2.4 : 1.8} />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
