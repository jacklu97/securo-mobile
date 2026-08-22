import type { ElementType } from 'react'
import { Building2, CreditCard, PiggyBank, TrendingUp, Wallet } from 'lucide-react'
import type { Account } from './types'

// securo's ACCOUNT_TYPE_CONFIG (account-icon.tsx), verbatim classes.
export const ACCOUNT_TYPE_CONFIG: Record<
  string,
  { icon: ElementType; color: string; bg: string; label: string }
> = {
  checking:    { icon: Building2,  color: 'text-indigo-600',  bg: 'bg-indigo-100',  label: 'Checking' },
  savings:     { icon: PiggyBank,  color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Savings' },
  credit_card: { icon: CreditCard, color: 'text-violet-600',  bg: 'bg-violet-100',  label: 'Credit card' },
  investment:  { icon: TrendingUp, color: 'text-amber-600',   bg: 'bg-amber-100',   label: 'Investment' },
  wallet:      { icon: Wallet,     color: 'text-rose-600',    bg: 'bg-rose-100',    label: 'Wallet' },
}

export const ACCOUNT_TYPE_OPTIONS = Object.entries(ACCOUNT_TYPE_CONFIG).map(
  ([value, config]) => ({ value, label: config.label }),
)

export function getAccountTypeConfig(type: string) {
  return ACCOUNT_TYPE_CONFIG[type] ?? ACCOUNT_TYPE_CONFIG['checking']
}

export function getAccountName(account: Account): string {
  return account.display_name ?? account.name
}

export function formatAccountMask(account: Account): string | null {
  return account.masked_number ? `•••• ${account.masked_number}` : null
}

/** Red when the balance means debt: positive on a credit card, negative elsewhere. */
export function balanceIsNegative(account: Account): boolean {
  const balance = Number(account.current_balance)
  return account.type === 'credit_card' ? balance > 0 : balance < 0
}
