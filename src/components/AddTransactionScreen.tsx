import { useEffect, useState } from 'react'
import { todayIso } from '../lib/format'
import { createTransaction, listAccounts, listCategories } from '../lib/securo'
import type { Account, Category, Workspace } from '../lib/types'

interface AddTransactionScreenProps {
  workspace: Workspace | null
  onSaved: () => void
}

export function AddTransactionScreen({ workspace, onSaved }: AddTransactionScreenProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [type, setType] = useState<'debit' | 'credit'>('debit')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayIso())
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!workspace) return
    listAccounts()
      .then((list) => {
        const open = list.filter((account) => !account.is_closed)
        setAccounts(open)
        setAccountId((current) => current || (open[0]?.id ?? ''))
      })
      .catch(() => setError('Could not load accounts'))
    listCategories()
      .then((list) => setCategories(list.filter((category) => !category.is_ignored)))
      .catch(() => {})
  }, [workspace])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const value = Number.parseFloat(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than zero')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createTransaction({
        description: description.trim(),
        amount: value,
        date,
        type,
        account_id: accountId,
        category_id: categoryId || null,
      })
      setAmount('')
      setDescription('')
      setCategoryId('')
      setDate(todayIso())
      onSaved()
    } catch {
      setError('Could not save the transaction')
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-700 bg-surface px-4 py-3 text-white outline-none focus:border-accent'

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4 p-4 pt-6">
      <h1 className="text-xl font-semibold text-white">Add transaction</h1>

      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-700">
        {(['debit', 'credit'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setType(option)}
            className={`py-2.5 text-sm font-medium ${
              type === option ? 'bg-accent text-slate-900' : 'bg-surface text-slate-300'
            }`}
          >
            {option === 'debit' ? 'Expense' : 'Income'}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm text-slate-300">Amount</span>
        <input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="decimal"
          placeholder="0.00"
          required
          className={`${inputClass} text-2xl font-semibold`}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-slate-300">Description</span>
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Coffee, groceries…"
          required
          maxLength={200}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-slate-300">Date</span>
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-slate-300">Account</span>
        <select
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          required
          className={inputClass}
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.display_name ?? account.name}
              {account.masked_number ? ` ••${account.masked_number}` : ''}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-slate-300">Category (optional)</span>
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className={inputClass}
        >
          <option value="">Uncategorized</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !accountId}
        className="rounded-xl bg-accent py-3.5 font-semibold text-slate-900 disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Save transaction'}
      </button>
    </form>
  )
}
