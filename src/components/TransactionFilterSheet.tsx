import { useState } from 'react'
import { X } from 'lucide-react'
import { getAccountLabel } from '../lib/account-utils'
import type { Account, Category, TransactionFilters } from '../lib/types'

interface TransactionFilterSheetProps {
  filters: TransactionFilters
  accounts: Account[]
  categories: Category[]
  onApply: (filters: TransactionFilters) => void
  onClose: () => void
}

const UNCATEGORIZED = '__uncategorized__'

export function TransactionFilterSheet({
  filters,
  accounts,
  categories,
  onApply,
  onClose,
}: TransactionFilterSheetProps) {
  const [accountId, setAccountId] = useState(filters.account_id ?? '')
  const [categoryId, setCategoryId] = useState(
    filters.uncategorized ? UNCATEGORIZED : (filters.category_id ?? ''),
  )
  const [type, setType] = useState(filters.type ?? '')
  const [status, setStatus] = useState(filters.status ?? '')
  const [from, setFrom] = useState(filters.from ?? '')
  const [to, setTo] = useState(filters.to ?? '')
  const [minAmount, setMinAmount] = useState(filters.min_amount?.toString() ?? '')
  const [maxAmount, setMaxAmount] = useState(filters.max_amount?.toString() ?? '')

  const apply = () => {
    const parseAmount = (value: string) => {
      const parsed = Number.parseFloat(value)
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
    }
    onApply({
      account_id: accountId || undefined,
      category_id: categoryId && categoryId !== UNCATEGORIZED ? categoryId : undefined,
      uncategorized: categoryId === UNCATEGORIZED || undefined,
      type: (type || undefined) as TransactionFilters['type'],
      status: (status || undefined) as TransactionFilters['status'],
      from: from || undefined,
      to: to || undefined,
      min_amount: parseAmount(minAmount),
      max_amount: parseAmount(maxAmount),
    })
  }

  const inputClass =
    'w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary'
  const labelClass = 'mb-1.5 block text-sm text-muted-foreground'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Filters</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className={labelClass}>Account</span>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
              <option value="">All accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {getAccountLabel(account)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>Category</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
              <option value="">All categories</option>
              <option value={UNCATEGORIZED}>Uncategorized only</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelClass}>Type</span>
              <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
                <option value="">All</option>
                <option value="debit">Expenses</option>
                <option value="credit">Income</option>
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                <option value="">All</option>
                <option value="posted">Posted</option>
                <option value="pending">Pending</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelClass}>From</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>To</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelClass}>Min amount</span>
              <input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Max amount</span>
              <input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </label>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => onApply({})}
              className="flex-1 rounded-xl border border-border py-3 text-sm text-muted-foreground"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={apply}
              className="flex-1 rounded-xl bg-primary py-3 font-semibold text-primary-foreground"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
