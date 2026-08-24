import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { todayIso } from '../lib/format'
import { submitTransaction } from '../lib/outbox'
import { listAccounts, listCategories } from '../lib/securo'
import type { Account, Category, Workspace } from '../lib/types'

interface AddTransactionScreenProps {
  workspace: Workspace | null
  onSaved: () => void
}

export function AddTransactionScreen({ workspace, onSaved }: AddTransactionScreenProps) {
  const { t } = useTranslation()
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
      .catch(() => setError(t('tx.errAccounts')))
    listCategories()
      .then((list) => setCategories(list.filter((category) => !category.is_ignored)))
      .catch(() => {})
  }, [workspace])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const value = Number.parseFloat(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError(t('tx.errAmount'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await submitTransaction({
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
      setError(t('tx.errSave'))
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground outline-none focus:border-primary'

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4 p-4 pt-6">
      <h1 className="text-xl font-semibold text-foreground">{t('tx.addTitle')}</h1>

      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border">
        {(['debit', 'credit'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setType(option)}
            className={`py-2.5 text-sm font-medium ${
              type === option ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'
            }`}
          >
            {option === 'debit' ? t('tx.expense') : t('tx.income')}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm text-muted-foreground">{t('tx.amount')}</span>
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
        <span className="mb-1.5 block text-sm text-muted-foreground">{t('tx.description')}</span>
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t('tx.descriptionPlaceholder')}
          required
          maxLength={200}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-muted-foreground">{t('tx.date')}</span>
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-muted-foreground">{t('tx.account')}</span>
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
        <span className="mb-1.5 block text-sm text-muted-foreground">{t('tx.categoryOptional')}</span>
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className={inputClass}
        >
          <option value="">{t('home.uncategorized')}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-rose-500">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !accountId}
        className="rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground disabled:opacity-50"
      >
        {busy ? t('common.saving') : t('tx.save')}
      </button>
    </form>
  )
}
