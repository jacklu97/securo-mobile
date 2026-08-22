import type { DeviceCredentials } from './types'

const CREDS_KEY = 'securo_device_credentials'

export function loadCredentials(): DeviceCredentials | null {
  const raw = localStorage.getItem(CREDS_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as DeviceCredentials
    if (parsed.instanceUrl && parsed.deviceId && parsed.refreshToken) return parsed
  } catch {
    // fall through to null
  }
  return null
}

export function saveCredentials(creds: DeviceCredentials): void {
  localStorage.setItem(CREDS_KEY, JSON.stringify(creds))
}

export function clearCredentials(): void {
  localStorage.removeItem(CREDS_KEY)
}
