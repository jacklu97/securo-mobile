import { ApiError, WORKSPACE_STORAGE_KEY, authedFetch } from './api'
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

// GET cache so tab switches don't refetch identical data, persisted to
// localStorage so a fresh launch while offline still has something to show.
// Lives in the web layer (not Rust) so every target — including the PWA,
// which has no Rust side — shares the same behavior. Keys are
// workspace-scoped; mutations clear it after they succeed.
const CACHE_TTL_MS = 60_000
const CACHE_STORAGE_KEY = 'securo_get_cache'

function loadPersistedCache(): Map<string, { at: number; data: unknown }> {
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY)
    if (raw) return new Map(Object.entries(JSON.parse(raw)))
  } catch {
    // corrupted cache is disposable
  }
  return new Map()
}

const getCache = loadPersistedCache()
const inflight = new Map<string, Promise<unknown>>()

function persistCache(): void {
  try {
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(Object.fromEntries(getCache)))
  } catch {
    // quota exceeded: in-memory cache still works
  }
}

export function invalidateCache(): void {
  getCache.clear()
  localStorage.removeItem(CACHE_STORAGE_KEY)
}

async function getJson<T>(path: string): Promise<T> {
  const workspaceId = localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? ''
  const key = `${workspaceId}:${path}`
  const hit = getCache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data as T
  // Concurrent callers (e.g. a double render) share one request.
  const pending = inflight.get(key)
  if (pending) return pending as Promise<T>
  const promise = (async () => {
    try {
      const response = await authedFetch(path)
      const data = (await response.json()) as T
      getCache.set(key, { at: Date.now(), data })
      persistCache()
      return data
    } catch (err) {
      // Offline: an expired cache entry beats an error screen.
      if (err instanceof ApiError && err.transient && hit) return hit.data as T
      throw err
    }
  })().finally(() => inflight.delete(key))
  inflight.set(key, promise)
  return promise as Promise<T>
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
  invalidateCache()
  return (await response.json()) as Account
}

export async function updateAccount(id: string, payload: AccountUpdatePayload): Promise<Account> {
  const response = await authedFetch(`/accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  invalidateCache()
  return (await response.json()) as Account
}

export async function deleteAccount(id: string): Promise<void> {
  await authedFetch(`/accounts/${id}`, { method: 'DELETE' })
  invalidateCache()
}

export const listCategories = () => getJson<Category[]>('/categories')

export const listCategoryGroups = () => getJson<CategoryGroup[]>('/category-groups')

export async function createCategory(payload: CategoryPayload): Promise<Category> {
  const response = await authedFetch('/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  invalidateCache()
  return (await response.json()) as Category
}

export async function updateCategory(id: string, payload: Partial<CategoryPayload>): Promise<Category> {
  const response = await authedFetch(`/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  invalidateCache()
  return (await response.json()) as Category
}

export async function deleteCategory(id: string): Promise<void> {
  await authedFetch(`/categories/${id}`, { method: 'DELETE' })
  invalidateCache()
}

export const getDashboardSummary = () => getJson<DashboardSummary>('/dashboard/summary')

export const getSpendingByCategory = () =>
  getJson<SpendingByCategory[]>('/dashboard/spending-by-category')

export const listTransactions = (
  params: { page?: number; limit?: number; q?: string } & TransactionFilters,
) => getJson<PaginatedTransactions>(`/transactions${query({ limit: 25, ...params })}`)

export async function createTransaction(
  payload: TransactionCreatePayload,
  workspaceId?: string,
): Promise<Transaction> {
  // workspaceId pins an outbox replay to the workspace it was recorded in,
  // even if the user switched workspaces while offline.
  const response = await authedFetch('/transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
    ...(workspaceId ? { headers: { 'X-Workspace-Id': workspaceId } } : {}),
  })
  invalidateCache()
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
  invalidateCache()
  return (await response.json()) as Transaction
}

export async function deleteTransaction(id: string): Promise<void> {
  await authedFetch(`/transactions/${id}?apply_to=this`, { method: 'DELETE' })
  invalidateCache()
}
