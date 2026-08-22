import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import {
  balanceIsNegative,
  formatAccountMask,
  getAccountName,
  getAccountTypeConfig,
} from '../lib/account-utils'
import { formatMoney } from '../lib/format'
import { deleteAccount, listAccounts } from '../lib/securo'
import type { Account, Workspace } from '../lib/types'
import { AccountFormSheet } from './AccountFormSheet'
import { AccountIcon } from './AccountIcon'

interface AccountsScreenProps {
  workspace: Workspace | null
}

export function AccountsScreen({ workspace }: AccountsScreenProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [formAccount, setFormAccount] = useState<Account | null | 'new'>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(false)
    try {
      setAccounts((await listAccounts()).filter((account) => !account.is_closed))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!workspace) return
    setLoading(true)
    void load()
  }, [workspace, load])

  const handleDelete = async (account: Account) => {
    setDeletingId(account.id)
    try {
      await deleteAccount(account.id)
      setAccounts((current) => current.filter((item) => item.id !== account.id))
      setConfirmDeleteId(null)
    } catch {
      setError(true)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 pt-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Accounts</h1>
        <button
          type="button"
          onClick={() => setFormAccount('new')}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus size={16} />
          Add
        </button>
      </header>

      {error && (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-rose-500">
          Something went wrong — pull the list again or retry.
        </p>
      )}

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {accounts.map((account) => {
          const config = getAccountTypeConfig(account.type)
          const mask = formatAccountMask(account)
          const balance = Number(account.current_balance)
          const isConfirming = confirmDeleteId === account.id
          const isDeleting = deletingId === account.id

          return (
            <li key={account.id} className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => setFormAccount(account)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <AccountIcon account={account} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-foreground">
                    {getAccountName(account)}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {config.label}
                    {mask ? ` · ${mask}` : ''}
                    {account.institution_name ? ` · ${account.institution_name}` : ''}
                  </span>
                </span>
                <span
                  className={`shrink-0 text-sm font-medium ${
                    balanceIsNegative(account) ? 'text-rose-500' : 'text-foreground'
                  }`}
                >
                  {formatMoney(balance, account.currency)}
                </span>
              </button>

              {isConfirming ? (
                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void handleDelete(account)}
                    disabled={isDeleting}
                    className="rounded-lg bg-destructive/15 px-2.5 py-1.5 text-xs font-medium text-destructive disabled:opacity-50"
                  >
                    {isDeleting ? '…' : 'Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    disabled={isDeleting}
                    aria-label="Cancel"
                    className="p-1.5 text-muted-foreground"
                  >
                    <X size={14} />
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(account.id)}
                  aria-label={`Delete ${getAccountName(account)}`}
                  className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </li>
          )
        })}
        {!loading && accounts.length === 0 && !error && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            No accounts yet — add your first one
          </li>
        )}
        {loading && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</li>
        )}
      </ul>

      {formAccount !== null && (
        <AccountFormSheet
          key={formAccount === 'new' ? 'new' : formAccount.id}
          account={formAccount === 'new' ? null : formAccount}
          workspace={workspace}
          onClose={() => setFormAccount(null)}
          onSaved={() => {
            setFormAccount(null)
            void load()
          }}
        />
      )}
    </div>
  )
}
