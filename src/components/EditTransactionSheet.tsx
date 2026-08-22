import { useState } from 'react'
import { X } from 'lucide-react'
import { getAccountLabel } from '../lib/account-utils'
import { deleteTransaction, updateTransaction } from '../lib/securo'
import type { Account, Category, Transaction } from '../lib/types'

interface EditTransactionSheetProps {
  transaction: Transaction
  accounts: Account[]
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}

export function EditTransactionSheet({
  transaction,
  accounts,
  categories,
  onClose,
  onSaved,
}: EditTransactionSheetProps) {
  // Transfer legs are kept in sync server-side per pair; editing one leg's
  // money fields here would desync them, so those fields are locked.
  const isTransfer = transaction.transfer_pair_id !== null
  const [type, setType] = useState<'debit' | 'credit'>(transaction.type)
  const [amount, setAmount] = useState(Math.abs(transaction.amount).toString())
  const [description, setDescription] = useState(transaction.description)
  const [date, setDate] = useState(transaction.date)
  const [accountId, setAccountId] = useState(transaction.account_id ?? '')
  const [categoryId, setCategoryId] = useState(transaction.category?.id ?? '')
  const [notes, setNotes] = useState(transaction.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    const value = Number.parseFloat(amount)
    if (!isTransfer && (!Number.isFinite(value) || value <= 0)) {
      setError('Enter an amount greater than zero')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await updateTransaction(transaction.id, {
        description: description.trim(),
        category_id: categoryId || null,
        notes: notes.trim() || null,
        ...(!isTransfer && {
          amount: value,
          date,
          type,
          account_id: accountId,
        }),
      })
      onSaved()
    } catch {
      setError('Could not save the transaction')
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    setBusy(true)
    setError(null)
    try {
      await deleteTransaction(transaction.id)
      onSaved()
    } catch {
      setError('Could not delete the transaction')
      setBusy(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary disabled:opacity-50'
  const labelClass = 'mb-1.5 block text-sm text-muted-foreground'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Edit transaction</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground">
            <X size={20} />
          </button>
        </div>

        {isTransfer && (
          <p className="mb-4 rounded-xl border border-border bg-background/50 px-4 py-3 text-xs text-muted-foreground">
            This is one leg of a transfer — amount, date, type and account are managed with its pair.
          </p>
        )}

        <form onSubmit={(event) => void handleSave(event)} className="space-y-4">
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border">
            {(['debit', 'credit'] as const).map((option) => (
              <button
                key={option}
                type="button"
                disabled={isTransfer}
                onClick={() => setType(option)}
                className={`py-2.5 text-sm font-medium disabled:opacity-50 ${
                  type === option ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'
                }`}
              >
                {option === 'debit' ? 'Expense' : 'Income'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelClass}>Amount</span>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                required
                disabled={isTransfer}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Date</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
                disabled={isTransfer}
                className={inputClass}
              />
            </label>
          </div>

          <label className="block">
            <span className={labelClass}>Description</span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              maxLength={200}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Account</span>
            <select
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              disabled={isTransfer}
              className={inputClass}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {getAccountLabel(account)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>Category</span>
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

          <label className="block">
            <span className={labelClass}>Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              className={inputClass}
            />
          </label>

          {error && (
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            {confirmingDelete ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={busy}
                  className="flex-1 rounded-xl bg-destructive py-3 font-semibold text-destructive-foreground disabled:opacity-50"
                >
                  {busy ? 'Deleting…' : 'Confirm delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={busy}
                  className="flex-1 rounded-xl border border-border py-3 text-sm text-muted-foreground"
                >
                  Keep it
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  disabled={busy}
                  className="flex-1 rounded-xl border border-destructive/40 py-3 text-sm text-destructive"
                >
                  Delete
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
