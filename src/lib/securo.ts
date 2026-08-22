import { authedFetch } from './api'
import type {
  Account,
  AccountCreatePayload,
  AccountUpdatePayload,
  Category,
  CategoryGroup,
  CategoryPayload,
  CurrencyInfo,
  DashboardSummary,
  PaginatedTransactions,
  SpendingByCategory,
  Transaction,
  TransactionCreatePayload,
  TransactionFilters,
  TransactionUpdatePayload,
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

export const listCurrencies = () => getJson<CurrencyInfo[]>('/currencies')

export async function createAccount(payload: AccountCreatePayload): Promise<Account> {
  const response = await authedFetch('/accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return (await response.json()) as Account
}

export async function updateAccount(id: string, payload: AccountUpdatePayload): Promise<Account> {
  const response = await authedFetch(`/accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return (await response.json()) as Account
}

export async function deleteAccount(id: string): Promise<void> {
  await authedFetch(`/accounts/${id}`, { method: 'DELETE' })
}

export const listCategories = () => getJson<Category[]>('/categories')

export const listCategoryGroups = () => getJson<CategoryGroup[]>('/category-groups')

export async function createCategory(payload: CategoryPayload): Promise<Category> {
  const response = await authedFetch('/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return (await response.json()) as Category
}

export async function updateCategory(id: string, payload: Partial<CategoryPayload>): Promise<Category> {
  const response = await authedFetch(`/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return (await response.json()) as Category
}

export async function deleteCategory(id: string): Promise<void> {
  await authedFetch(`/categories/${id}`, { method: 'DELETE' })
}

export const getDashboardSummary = () => getJson<DashboardSummary>('/dashboard/summary')

export const getSpendingByCategory = () =>
  getJson<SpendingByCategory[]>('/dashboard/spending-by-category')

export const listTransactions = (
  params: { page?: number; limit?: number; q?: string } & TransactionFilters,
) => getJson<PaginatedTransactions>(`/transactions${query({ limit: 25, ...params })}`)

export async function createTransaction(payload: TransactionCreatePayload): Promise<Transaction> {
  const response = await authedFetch('/transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return (await response.json()) as Transaction
}

export async function updateTransaction(
  id: string,
  payload: TransactionUpdatePayload,
): Promise<Transaction> {
  const response = await authedFetch(`/transactions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return (await response.json()) as Transaction
}

export async function deleteTransaction(id: string): Promise<void> {
  await authedFetch(`/transactions/${id}?apply_to=this`, { method: 'DELETE' })
}
