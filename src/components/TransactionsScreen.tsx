import { useCallback, useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { CategoryIcon } from './CategoryIcon'
import { formatDay, formatMoney } from '../lib/format'
import { listTransactions } from '../lib/securo'
import type { Transaction, Workspace } from '../lib/types'

interface TransactionsScreenProps {
  workspace: Workspace | null
}

export function TransactionsScreen({ workspace }: TransactionsScreenProps) {
  const [items, setItems] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null)

  const load = useCallback(async (nextPage: number, search: string, replace: boolean) => {
    setLoading(true)
    setError(false)
    try {
      const result = await listTransactions({ page: nextPage, q: search || undefined })
      setItems((current) => (replace ? result.items : [...current, ...result.items]))
      setTotal(result.total)
      setPage(result.page)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!workspace) return
    setItems([])
    void load(1, q, true)
    // Reload from page 1 whenever the workspace changes; search runs via its own debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace, load])

  const handleSearch = (value: string) => {
    setQ(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => void load(1, value, true), 350)
  }

  const locale = workspace?.locale

  return (
    <div className="flex flex-col gap-4 p-4 pt-6">
      <h1 className="text-xl font-semibold text-white">Activity</h1>

      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={q}
          onChange={(event) => handleSearch(event.target.value)}
          placeholder="Search transactions"
          className="w-full rounded-xl border border-slate-700 bg-surface py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-accent"
        />
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Could not load transactions.
        </p>
      )}

      <ul className="divide-y divide-slate-800 overflow-hidden rounded-2xl border border-slate-700 bg-surface">
        {items.map((tx) => {
          const isCredit = tx.type === 'credit'
          const isTransfer = tx.transfer_pair_id !== null
          return (
            <li key={tx.id} className="flex items-center gap-3 px-4 py-3">
              <CategoryIcon icon={tx.category?.icon} color={tx.category?.color} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white">{tx.description}</p>
                <p className="text-xs text-slate-500">
                  {formatDay(tx.date, locale)}
                  {tx.payee_name ? ` · ${tx.payee_name}` : ''}
                  {tx.status === 'pending' ? ' · pending' : ''}
                </p>
              </div>
              <p
                className={`shrink-0 text-sm font-medium ${
                  isTransfer ? 'text-slate-400' : isCredit ? 'text-emerald-400' : 'text-slate-200'
                }`}
              >
                {isCredit ? '+' : '−'}
                {formatMoney(Math.abs(tx.amount), tx.currency, locale)}
              </p>
            </li>
          )
        })}
        {!loading && items.length === 0 && !error && (
          <li className="px-4 py-8 text-center text-sm text-slate-500">No transactions found</li>
        )}
      </ul>

      {items.length < total && (
        <button
          type="button"
          disabled={loading}
          onClick={() => void load(page + 1, q, false)}
          className="rounded-xl border border-slate-700 py-3 text-sm text-slate-300 disabled:opacity-50"
        >
          {loading ? 'Loading…' : `Load more (${items.length} of ${total})`}
        </button>
      )}
    </div>
  )
}
