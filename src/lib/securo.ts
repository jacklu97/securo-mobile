import { authedFetch } from './api'
import type {
  Account,
  Category,
  DashboardSummary,
  PaginatedTransactions,
  SpendingByCategory,
  Transaction,
  TransactionCreatePayload,
  Workspace,
} from './types'

async function getJson<T>(path: string): Promise<T> {
  const response = await authedFetch(path)
  return (await response.json()) as T
}

function query(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const encoded = search.toString()
  return encoded ? `?${encoded}` : ''
}

export const listWorkspaces = () => getJson<Workspace[]>('/workspaces')

export const listAccounts = () => getJson<Account[]>('/accounts')

export const listCategories = () => getJson<Category[]>('/categories')

export const getDashboardSummary = () => getJson<DashboardSummary>('/dashboard/summary')

export const getSpendingByCategory = () =>
  getJson<SpendingByCategory[]>('/dashboard/spending-by-category')

export const listTransactions = (params: { page?: number; limit?: number; q?: string }) =>
  getJson<PaginatedTransactions>(`/transactions${query({ limit: 25, ...params })}`)

export async function createTransaction(payload: TransactionCreatePayload): Promise<Transaction> {
  const response = await authedFetch('/transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return (await response.json()) as Transaction
}
