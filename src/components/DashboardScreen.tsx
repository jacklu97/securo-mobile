import { useEffect, useState } from 'react'
import { formatMoney } from '../lib/format'
import { CategoryIcon } from './CategoryIcon'
import { getDashboardSummary, getSpendingByCategory } from '../lib/securo'
import type { DashboardSummary, SpendingByCategory, Workspace } from '../lib/types'

interface DashboardScreenProps {
  workspace: Workspace | null
  workspaces: Workspace[]
  onSelectWorkspace: (id: string) => void
}

export function DashboardScreen({ workspace, workspaces, onSelectWorkspace }: DashboardScreenProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [spending, setSpending] = useState<SpendingByCategory[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!workspace) return
    setSummary(null)
    setError(false)
    getDashboardSummary().then(setSummary).catch(() => setError(true))
    getSpendingByCategory().then(setSpending).catch(() => {})
  }, [workspace])

  const currency = summary?.primary_currency ?? workspace?.default_currency ?? 'USD'

  return (
    <div className="flex flex-col gap-4 p-4 pt-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Home</h1>
        {workspaces.length > 1 && (
          <select
            value={workspace?.id ?? ''}
            onChange={(event) => onSelectWorkspace(event.target.value)}
            className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-foreground"
          >
            {workspaces.map((item) => (
              <option key={item.id} value={item.id}>
                {item.icon ? `${item.icon} ` : ''}{item.name}
              </option>
            ))}
          </select>
        )}
      </header>

      {error && (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-rose-500">
          Could not load the dashboard.
        </p>
      )}

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Total balance</p>
        <p className="mt-1 text-3xl font-semibold text-foreground">
          {summary ? formatMoney(summary.total_balance_primary, currency) : '—'}
        </p>
        {summary && summary.pending_categorization > 0 && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
            {summary.pending_categorization} transaction
            {summary.pending_categorization === 1 ? '' : 's'} to categorize
          </p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Income this month</p>
          <p className="mt-1 text-lg font-medium text-emerald-600 dark:text-emerald-400">
            {summary ? formatMoney(summary.monthly_income_primary, currency) : '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Spent this month</p>
          <p className="mt-1 text-lg font-medium text-rose-500">
            {summary ? formatMoney(summary.monthly_expenses_primary, currency) : '—'}
          </p>
        </div>
      </section>

      {spending.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Spending by category</h2>
          <ul className="space-y-3">
            {spending.slice(0, 8).map((row) => (
              <li key={row.category_id ?? 'uncategorized'}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-foreground">
                    <CategoryIcon icon={row.category_icon} color={row.category_color} size={20} />
                    <span className="truncate">{row.category_id === null ? 'Uncategorized' : row.category_name}</span>
                  </span>
                  <span className="ml-3 shrink-0 text-muted-foreground">
                    {formatMoney(row.total, currency)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(2, row.percentage))}%`,
                      backgroundColor: row.category_color || 'var(--primary)',
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
