import { ApiError, WORKSPACE_STORAGE_KEY } from './api'
import { createTransaction } from './securo'
import type { TransactionCreatePayload } from './types'

/**
 * Offline outbox: transactions recorded while the instance is unreachable are
 * queued in localStorage and replayed, oldest first, once connectivity
 * returns. Each entry remembers the workspace it was recorded in so a later
 * workspace switch cannot reroute it.
 */

export interface QueuedTransaction {
  localId: string
  workspaceId: string | null
  queuedAt: string
  payload: TransactionCreatePayload
}

const OUTBOX_KEY = 'securo_outbox'
const SYNC_EVENT = 'securo-sync'

type Listener = () => void
const listeners = new Set<Listener>()

function notify(): void {
  listeners.forEach((listener) => listener())
}

/** Subscribe to outbox changes (queue length). Returns an unsubscribe fn. */
export function onOutboxChange(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Screens listen for this on window to reload after a successful sync. */
export function onSyncComplete(listener: Listener): () => void {
  window.addEventListener(SYNC_EVENT, listener)
  return () => window.removeEventListener(SYNC_EVENT, listener)
}

export function listQueued(): QueuedTransaction[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '[]') as QueuedTransaction[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function pendingCount(): number {
  return listQueued().length
}

function saveQueue(queue: QueuedTransaction[]): void {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(queue))
  notify()
}

/**
 * Create the transaction now, or queue it when the instance is unreachable.
 * Definitive rejections (validation errors etc.) are NOT queued — retrying
 * an invalid payload forever helps nobody — they propagate to the form.
 */
export async function submitTransaction(
  payload: TransactionCreatePayload,
): Promise<'created' | 'queued'> {
  try {
    await createTransaction(payload)
    return 'created'
  } catch (err) {
    if (err instanceof ApiError && err.transient) {
      saveQueue([
        ...listQueued(),
        {
          localId: crypto.randomUUID(),
          workspaceId: localStorage.getItem(WORKSPACE_STORAGE_KEY),
          queuedAt: new Date().toISOString(),
          payload,
        },
      ])
      return 'queued'
    }
    throw err
  }
}

let flushing = false

/**
 * Replay the queue oldest-first. Stops at the first transient failure (still
 * offline); drops entries the server definitively rejects so one bad payload
 * cannot wedge the queue. Emits the sync event when anything was uploaded.
 */
export async function flushOutbox(): Promise<number> {
  if (flushing) return 0
  flushing = true
  let uploaded = 0
  try {
    let queue = listQueued()
    while (queue.length > 0) {
      const item = queue[0]
      try {
        await createTransaction(item.payload, item.workspaceId ?? undefined)
        uploaded += 1
      } catch (err) {
        if (err instanceof ApiError && err.transient) break
        // Definitive rejection: drop it rather than blocking the queue.
        console.warn('outbox: dropping rejected transaction', item, err)
      }
      queue = queue.slice(1)
      saveQueue(queue)
    }
  } finally {
    flushing = false
  }
  if (uploaded > 0) {
    window.dispatchEvent(new Event(SYNC_EVENT))
  }
  return uploaded
}

const FLUSH_INTERVAL_MS = 25_000

/** Try to sync whenever connectivity plausibly returned. Call once from the shell. */
export function startAutoFlush(): () => void {
  const attempt = () => {
    if (pendingCount() > 0) void flushOutbox()
  }
  const interval = setInterval(attempt, FLUSH_INTERVAL_MS)
  window.addEventListener('online', attempt)
  document.addEventListener('visibilitychange', attempt)
  return () => {
    clearInterval(interval)
    window.removeEventListener('online', attempt)
    document.removeEventListener('visibilitychange', attempt)
  }
}
