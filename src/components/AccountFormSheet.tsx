import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { ACCOUNT_TYPE_OPTIONS } from '../lib/account-utils'
import { todayIso } from '../lib/format'
import { createAccount, listCurrencies, updateAccount } from '../lib/securo'
import type { Account, AccountUpdatePayload, CurrencyInfo, Workspace } from '../lib/types'

interface AccountFormSheetProps {
  account: Account | null
  workspace: Workspace | null
  onClose: () => void
  onSaved: () => void
}

// Day-of-month field: 1-31 or null, same parsing securo's dialog applies.
function parseDay(value: string): number | null {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 31 ? parsed : null
}

export function AccountFormSheet({ account, workspace, onClose, onSaved }: AccountFormSheetProps) {
  const { t } = useTranslation()
  const isConnected = !!account?.connection_id
  const [currenciesList, setCurrenciesList] = useState<CurrencyInfo[]>([])
  const [name, setName] = useState(account?.name ?? '')
  const [displayName, setDisplayName] = useState(account?.display_name ?? '')
  const [type, setType] = useState(account?.type ?? 'checking')
  const [balance, setBalance] = useState(account?.balance?.toString() ?? '0')
  const [balanceDate, setBalanceDate] = useState(todayIso())
  const [currency, setCurrency] = useState(
    account?.currency ?? workspace?.default_currency ?? 'USD',
  )
  const [creditLimit, setCreditLimit] = useState(account?.credit_limit?.toString() ?? '')
  const [statementCloseDay, setStatementCloseDay] = useState(
    account?.statement_close_day?.toString() ?? '',
  )
  const [paymentDueDay, setPaymentDueDay] = useState(account?.payment_due_day?.toString() ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listCurrencies()
      .then(setCurrenciesList)
      .catch(() => {})
  }, [])

  const isCreditCard = type === 'credit_card'

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    // Same payload shape as securo's account dialog: connected accounts only
    // accept display_name/type (+ credit-card fields); manual accounts take all.
    const creditCardFields = isCreditCard
      ? {
          credit_limit: creditLimit !== '' ? Number.parseFloat(creditLimit) : null,
          statement_close_day: parseDay(statementCloseDay),
          payment_due_day: parseDay(paymentDueDay),
        }
      : {}
    try {
      if (!account) {
        await createAccount({
          name: name.trim(),
          type,
          balance: Number.parseFloat(balance) || 0,
          balance_date: balanceDate,
          currency,
          ...creditCardFields,
        })
      } else {
        const payload: AccountUpdatePayload = isConnected
          ? { type, display_name: displayName.trim() || null, ...creditCardFields }
          : {
              name: name.trim(),
              type,
              balance: Number.parseFloat(balance) || 0,
              balance_date: balanceDate,
              currency,
              ...creditCardFields,
            }
        await updateAccount(account.id, payload)
      }
      onSaved()
    } catch {
      setError(t('accounts.errSave'))
      setBusy(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary'
  const labelClass = 'mb-1.5 block text-sm text-muted-foreground'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {account ? t('accounts.editTitle') : t('accounts.addTitle')}
          </h2>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="text-muted-foreground">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <label className="block">
            <span className={labelClass}>{t('accounts.name')}</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              disabled={isConnected}
              className={`${inputClass} disabled:opacity-50`}
            />
          </label>

          {isConnected && (
            <label className="block">
              <span className={labelClass}>{t('accounts.displayName')}</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder={name}
                className={inputClass}
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                {t('accounts.displayNameHint')}
              </span>
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelClass}>{t('accounts.type')}</span>
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
                className={inputClass}
              >
                {ACCOUNT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.label)}
                  </option>
                ))}
              </select>
            </label>
            {!isConnected && (
              <label className="block">
                <span className={labelClass}>{t('accounts.currency')}</span>
                <select
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  className={inputClass}
                >
                  {(currenciesList.length > 0
                    ? currenciesList
                    : [{ code: currency, symbol: currency, name: currency, flag: '' }]
                  ).map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.flag} {item.code}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {!isConnected && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelClass}>
                  {isCreditCard ? t('accounts.currentDebt') : t('accounts.balance')}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min={isCreditCard ? '0' : undefined}
                  value={balance}
                  onChange={(event) => setBalance(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>{t('accounts.asOf')}</span>
                <input
                  type="date"
                  value={balanceDate}
                  onChange={(event) => setBalanceDate(event.target.value)}
                  required
                  className={inputClass}
                />
              </label>
            </div>
          )}

          {isCreditCard && (
            <div className="space-y-3 rounded-xl border border-border bg-background/50 p-3">
              <label className="block">
                <span className={labelClass}>{t('accounts.creditLimit')}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={creditLimit}
                  onChange={(event) => setCreditLimit(event.target.value)}
                  placeholder="0.00"
                  className={inputClass}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelClass}>{t('accounts.statementCloseDay')}</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={statementCloseDay}
                    onChange={(event) => setStatementCloseDay(event.target.value)}
                    placeholder="1-31"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>{t('accounts.paymentDueDay')}</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={paymentDueDay}
                    onChange={(event) => setPaymentDueDay(event.target.value)}
                    placeholder="1-31"
                    className={inputClass}
                  />
                </label>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-rose-500">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-3 text-sm text-muted-foreground"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
