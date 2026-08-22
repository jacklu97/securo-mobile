import { useCallback, useEffect, useState } from 'react'
import { ApiError, getCurrentUser, sendHeartbeat, unpairDevice } from '../lib/api'
import { clearCredentials } from '../lib/storage'
import type { CurrentUser, DeviceCredentials } from '../lib/types'

const HEARTBEAT_MS = 30_000

interface SettingsScreenProps {
  creds: DeviceCredentials
  onUnpaired: () => void
}

type Status = 'connecting' | 'connected' | 'offline'

export function SettingsScreen({ creds, onUnpaired }: SettingsScreenProps) {
  const [status, setStatus] = useState<Status>('connecting')
  const [user, setUser] = useState<CurrentUser | null>(null)

  const beat = useCallback(async () => {
    try {
      await sendHeartbeat(creds.deviceId)
      setStatus('connected')
    } catch (err) {
      // A dead refresh token means the device was revoked server-side.
      if (err instanceof ApiError && err.status === 401) {
        clearCredentials()
        onUnpaired()
        return
      }
      setStatus('offline')
    }
  }, [creds.deviceId, onUnpaired])

  useEffect(() => {
    void beat()
    getCurrentUser().then(setUser).catch(() => {})
    const interval = setInterval(() => void beat(), HEARTBEAT_MS)
    return () => clearInterval(interval)
  }, [beat])

  const [unpairing, setUnpairing] = useState(false)

  const unpair = async () => {
    setUnpairing(true)
    try {
      // Revoke server-side so securo's device manager forgets this device.
      // Best-effort: if the instance is unreachable we still unpair locally.
      await unpairDevice(creds.deviceId)
    } catch {
      // ignore — local credentials are cleared either way
    } finally {
      clearCredentials()
      onUnpaired()
    }
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-6 p-6">
      <header className="flex items-center gap-3 pt-4">
        <img src="/pwa-192.png" alt="" className="size-10 rounded-xl" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-white">Settings</h1>
          <p className="text-xs text-slate-400">{creds.deviceName}</p>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${
            status === 'connected'
              ? 'bg-emerald-500/10 text-emerald-400'
              : status === 'offline'
                ? 'bg-red-500/10 text-red-300'
                : 'bg-slate-500/10 text-slate-300'
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${
              status === 'connected'
                ? 'bg-emerald-400'
                : status === 'offline'
                  ? 'bg-red-400'
                  : 'bg-slate-400 animate-pulse'
            }`}
          />
          {status === 'connected' ? 'Connected' : status === 'offline' ? 'Offline' : 'Connecting'}
        </span>
      </header>

      <section className="rounded-2xl border border-slate-700 bg-surface p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-300">Paired instance</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Instance</dt>
            <dd className="truncate text-white">{creds.instanceUrl}</dd>
          </div>
          {user && (
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Account</dt>
              <dd className="truncate text-white">{user.email}</dd>
            </div>
          )}
        </dl>
      </section>

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => void unpair()}
        disabled={unpairing}
        className="w-full rounded-xl border border-red-500/40 py-3 text-sm text-red-300 disabled:opacity-50"
      >
        {unpairing ? 'Unpairing…' : 'Unpair this device'}
      </button>
    </div>
  )
}
