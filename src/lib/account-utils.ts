import type { ElementType } from 'react'
import { Building2, CreditCard, PiggyBank, TrendingUp, Wallet } from 'lucide-react'
import type { Account } from './types'

// Mirrors securo's ACCOUNT_TYPE_CONFIG (account-icon.tsx): same types, icons and
// hue per type, with the tints adapted to this app's dark theme.
export const ACCOUNT_TYPE_CONFIG: Record<
  string,
  { icon: ElementType; color: string; bg: string; label: string }
> = {
  checking:    { icon: Building2,  color: 'text-indigo-400',  bg: 'bg-indigo-500/15',  label: 'Checking' },
  savings:     { icon: PiggyBank,  color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Savings' },
  credit_card: { icon: CreditCard, color: 'text-violet-400',  bg: 'bg-violet-500/15',  label: 'Credit card' },
  investment:  { icon: TrendingUp, color: 'text-amber-400',   bg: 'bg-amber-500/15',   label: 'Investment' },
  wallet:      { icon: Wallet,     color: 'text-rose-400',    bg: 'bg-rose-500/15',    label: 'Wallet' },
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
