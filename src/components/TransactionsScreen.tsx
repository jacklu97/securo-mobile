import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { formatDay, formatMoney } from '../lib/format'
import { listAccounts, listCategories, listTransactions } from '../lib/securo'
import type {
  Account,
  Category,
  Transaction,
  TransactionFilters,
  TransactionsSummary,
  Workspace,
} from '../lib/types'
import { CategoryIcon } from './CategoryIcon'
import { EditTransactionSheet } from './EditTransactionSheet'
import { TransactionFilterSheet } from './TransactionFilterSheet'

interface TransactionsScreenProps {
  workspace: Workspace | null
}

export function TransactionsScreen({ workspace }: TransactionsScreenProps) {
  const [items, setItems] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<TransactionsSummary | null>(null)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState<TransactionFilters>({})
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null)

  const load = useCallback(
    async (nextPage: number, search: string, activeFilters: TransactionFilters, replace: boolean) => {
      setLoading(true)
      setError(false)
      try {
        const result = await listTransactions({
          page: nextPage,
          q: search || undefined,
          ...activeFilters,
        })
        setItems((current) => (replace ? result.items : [...current, ...result.items]))
        setTotal(result.total)
        setSummary(result.summary ?? null)
        setPage(result.page)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (!workspace) return
    setItems([])
    void load(1, q, filters, true)
    listAccounts().then(setAccounts).catch(() => {})
    listCategories()
      .then((list) => setCategories(list.filter((category) => !category.is_ignored)))
      .catch(() => {})
    // Reload from page 1 whenever the workspace changes; search runs via its own debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace, load])

  const handleSearch = (value: string) => {
    setQ(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => void load(1, value, filters, true), 350)
  }

  const applyFilters = (next: TransactionFilters) => {
    setFilters(next)
    setShowFilters(false)
    void load(1, q, next, true)
  }

  const activeFilterCount = Object.values(filters).filter(
    (value) => value !== undefined && value !== false,
  ).length

  const currency = summary?.currency ?? workspace?.default_currency ?? 'USD'

  return (
    <div className="flex flex-col gap-4 p-4 pt-6">
      <h1 className="text-xl font-semibold text-foreground">Activity</h1>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Search transactions"
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(true)}
          aria-label="Filters"
          className={`relative flex items-center justify-center rounded-xl border px-3 ${
            activeFilterCount > 0
              ? 'border-primary text-primary'
              : 'border-border text-muted-foreground'
          }`}
        >
          <SlidersHorizontal size={16} />
          {activeFilterCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {summary && (activeFilterCount > 0 || q) && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-xs">
          <span className="text-emerald-600 dark:text-emerald-400">
            +{formatMoney(summary.income, currency)}
          </span>
          <span className="text-rose-500">−{formatMoney(summary.expense, currency)}</span>
          <span className="font-medium text-foreground">
            Net {formatMoney(summary.net, currency)}
          </span>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Could not load transactions.
        </p>
      )}

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {items.map((tx) => {
          const isCredit = tx.type === 'credit'
          const isTransfer = tx.transfer_pair_id !== null
          return (
            <li key={tx.id}>
              <button
                type="button"
                onClick={() => setEditing(tx)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <CategoryIcon icon={tx.category?.icon} color={tx.category?.color} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-foreground">{tx.description}</span>
                  <span className="block text-xs text-muted-foreground">
                    {formatDay(tx.date)}
                    {tx.payee_name ? ` · ${tx.payee_name}` : ''}
                    {tx.status === 'pending' ? ' · pending' : ''}
                    {isTransfer ? ' · transfer' : ''}
                  </span>
                </span>
                <span
                  className={`shrink-0 text-sm font-medium ${
                    isTransfer
                      ? 'text-muted-foreground'
                      : isCredit
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-foreground'
                  }`}
                >
                  {isCredit ? '+' : '−'}
                  {formatMoney(Math.abs(tx.amount), tx.currency)}
                </span>
              </button>
            </li>
          )
        })}
        {!loading && items.length === 0 && !error && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            No transactions found
          </li>
        )}
        {loading && items.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</li>
        )}
      </ul>

      {items.length < total && (
        <button
          type="button"
          disabled={loading}
          onClick={() => void load(page + 1, q, filters, false)}
          className="rounded-xl border border-border py-3 text-sm text-muted-foreground disabled:opacity-50"
        >
          {loading ? 'Loading…' : `Load more (${items.length} of ${total})`}
        </button>
      )}

      {showFilters && (
        <TransactionFilterSheet
          filters={filters}
          accounts={accounts}
          categories={categories}
          onApply={applyFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {editing && (
        <EditTransactionSheet
          key={editing.id}
          transaction={editing}
          accounts={accounts}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void load(1, q, filters, true)
          }}
        />
      )}
    </div>
  )
}
