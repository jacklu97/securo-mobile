export interface QrPayload {
  v: number
  url: string
  code: string
}

export interface DeviceCredentials {
  instanceUrl: string
  deviceId: string
  deviceName: string
  accessToken: string
  refreshToken: string
}

export interface PairResponse {
  device_id: string
  refresh_token: string
  access_token: string
  token_type: string
}

export interface CurrentUser {
  id: string
  email: string
  name?: string | null
}

export type DevicePlatform = 'ios' | 'android' | 'other'

// --- Securo domain types (trimmed to the fields this app renders) ---

export interface Workspace {
  id: string
  name: string
  kind: string
  is_archived: boolean
  default_currency: string
  locale: string | null
  icon: string | null
  color: string | null
}

export interface Category {
  id: string
  group_id: string | null
  name: string
  icon: string
  color: string
  is_system: boolean
  is_ignored: boolean
}

export interface Account {
  id: string
  connection_id: string | null
  name: string
  display_name: string | null
  masked_number: string | null
  institution_name: string | null
  institution_logo_url: string | null
  type: string
  balance: number
  current_balance: number
  currency: string
  credit_limit: number | null
  statement_close_day: number | null
  payment_due_day: number | null
  is_closed: boolean
}

export interface AccountCreatePayload {
  name: string
  type: string
  balance?: number
  balance_date?: string
  currency?: string
  credit_limit?: number | null
  statement_close_day?: number | null
  payment_due_day?: number | null
}

export interface AccountUpdatePayload {
  name?: string
  display_name?: string | null
  type?: string
  balance?: number
  balance_date?: string
  currency?: string
  credit_limit?: number | null
  statement_close_day?: number | null
  payment_due_day?: number | null
}

export interface CurrencyInfo {
  code: string
  symbol: string
  name: string
  flag: string
}

export interface Transaction {
  id: string
  account_id: string | null
  category: Category | null
  description: string
  amount: number
  currency: string
  date: string
  type: 'debit' | 'credit'
  status: 'posted' | 'pending'
  payee_name: string | null
  transfer_pair_id: string | null
  is_ignored: boolean
}

export interface TransactionsSummary {
  income: number
  expense: number
  net: number
  excluded: number
  currency: string
}

export interface PaginatedTransactions {
  items: Transaction[]
  total: number
  page: number
  limit: number
  summary?: TransactionsSummary
}

export interface TransactionCreatePayload {
  description: string
  amount: number
  date: string
  type: 'debit' | 'credit'
  account_id: string
  category_id?: string | null
  notes?: string | null
}

export interface DashboardSummary {
  total_balance: Record<string, number>
  total_balance_primary: number
  monthly_income_primary: number
  monthly_expenses_primary: number
  accounts_count: number
  pending_categorization: number
  primary_currency: string
}

export interface SpendingByCategory {
  category_id: string | null
  category_name: string
  category_icon: string
  category_color: string
  total: number
  percentage: number
}
