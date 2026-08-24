import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { Home, Landmark, List, Plus, Settings } from 'lucide-react'
import { CloudOff } from 'lucide-react'
import { WORKSPACE_STORAGE_KEY } from '../lib/api'
import { flushOutbox, onOutboxChange, pendingCount, startAutoFlush } from '../lib/outbox'
import { listAccounts, listCategories, listWorkspaces } from '../lib/securo'
import type { DeviceCredentials, Workspace } from '../lib/types'
import { AccountsScreen } from './AccountsScreen'
import { AddTransactionScreen } from './AddTransactionScreen'
import { DashboardScreen } from './DashboardScreen'
import { SettingsScreen } from './SettingsScreen'
import { TransactionsScreen } from './TransactionsScreen'

type Tab = 'home' | 'activity' | 'add' | 'accounts' | 'settings'

const TABS: { id: Tab; labelKey: string; icon: typeof Home }[] = [
  { id: 'home', labelKey: 'tabs.home', icon: Home },
  { id: 'activity', labelKey: 'tabs.activity', icon: List },
  { id: 'add', labelKey: 'tabs.add', icon: Plus },
  { id: 'accounts', labelKey: 'tabs.accounts', icon: Landmark },
  { id: 'settings', labelKey: 'tabs.settings', icon: Settings },
]

interface MainShellProps {
  creds: DeviceCredentials
  onUnpaired: () => void
}

export function MainShell({ creds, onUnpaired }: MainShellProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('home')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [workspaceId, setWorkspaceId] = useState<string | null>(
    localStorage.getItem(WORKSPACE_STORAGE_KEY),
  )
  const [loadError, setLoadError] = useState(false)
  const [pending, setPending] = useState(pendingCount)

  useEffect(() => {
    const unsubscribe = onOutboxChange(() => setPending(pendingCount()))
    const stopFlush = startAutoFlush()
    return () => {
      unsubscribe()
      stopFlush()
    }
  }, [])

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

  // Warm the lists the Add form depends on, so a later offline session can
  // still record transactions from the persisted cache.
  useEffect(() => {
    if (!workspaceId) return
    listAccounts().catch(() => {})
    listCategories().catch(() => {})
  }, [workspaceId])

  const workspace = workspaces.find((item) => item.id === workspaceId) ?? null

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {t('shell.couldNotReach', { url: creds.instanceUrl })}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground"
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
      {pending > 0 && (
        <button
          type="button"
          onClick={() => void flushOutbox()}
          className="mx-4 mt-3 flex items-center gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-left text-xs text-amber-600 dark:text-amber-300"
        >
          <CloudOff size={15} className="shrink-0" />
          <span className="flex-1">{t('outbox.pending', { count: pending })}</span>
        </button>
      )}
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
        {tab === 'accounts' && <AccountsScreen workspace={workspace} />}
        {tab === 'settings' && <SettingsScreen creds={creds} onUnpaired={onUnpaired} />}
      </div>

      <nav className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-md">
          {TABS.map(({ id, labelKey, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] ${
                tab === id ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon size={20} strokeWidth={tab === id ? 2.4 : 1.8} />
              {t(labelKey)}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
