import { useCallback, useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { ApiError, getCurrentUser, sendHeartbeat, unpairDevice } from '../lib/api'
import { clearCredentials } from '../lib/storage'
import { loadThemePreference, setThemePreference, type ThemePreference } from '../lib/theme'
import type { CurrentUser, DeviceCredentials } from '../lib/types'

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

const HEARTBEAT_MS = 30_000

interface SettingsScreenProps {
  creds: DeviceCredentials
  onUnpaired: () => void
}

type Status = 'connecting' | 'connected' | 'offline'

export function SettingsScreen({ creds, onUnpaired }: SettingsScreenProps) {
  const [status, setStatus] = useState<Status>('connecting')
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [theme, setTheme] = useState<ThemePreference>(loadThemePreference)

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
          <h1 className="text-lg font-semibold text-foreground">Settings</h1>
          <p className="text-xs text-muted-foreground">{creds.deviceName}</p>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${
            status === 'connected'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : status === 'offline'
                ? 'bg-destructive/10 text-destructive'
                : 'bg-muted text-muted-foreground'
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${
              status === 'connected'
                ? 'bg-emerald-400'
                : status === 'offline'
                  ? 'bg-destructive'
                  : 'bg-muted-foreground animate-pulse'
            }`}
          />
          {status === 'connected' ? 'Connected' : status === 'offline' ? 'Offline' : 'Connecting'}
        </span>
      </header>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Paired instance</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Instance</dt>
            <dd className="truncate text-foreground">{creds.instanceUrl}</dd>
          </div>
          {user && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Account</dt>
              <dd className="truncate text-foreground">{user.email}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Appearance</h2>
        <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-border">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setThemePreference(value)
                setTheme(value)
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 text-sm ${
                theme === value
                  ? 'bg-primary font-medium text-primary-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </section>

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => void unpair()}
        disabled={unpairing}
        className="w-full rounded-xl border border-destructive/40 py-3 text-sm text-destructive disabled:opacity-50"
      >
        {unpairing ? 'Unpairing…' : 'Unpair this device'}
      </button>
    </div>
  )
}
