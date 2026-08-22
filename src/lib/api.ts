import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import { isTauri, devicePlatform } from './platform'
import { loadCredentials, saveCredentials, clearCredentials } from './storage'
import type { CurrentUser, DeviceCredentials, PairResponse, QrPayload } from './types'

const APP_VERSION = '0.1.0'

// Inside Tauri use the http plugin so requests to the paired instance are not
// blocked by webview CORS; on the plain web (PWA) fall back to window.fetch.
const doFetch: typeof fetch = (...args) => (isTauri() ? tauriFetch(...args) : fetch(...args))

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function apiBase(instanceUrl: string): string {
  return `${instanceUrl.replace(/\/+$/, '')}/api`
}

export function parseQrPayload(raw: string): QrPayload {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('That QR code is not a Securo pairing code')
  }
  const payload = parsed as Partial<QrPayload>
  if (payload.v !== 1 || !payload.url || !payload.code) {
    throw new Error('Unsupported pairing code format')
  }
  return payload as QrPayload
}

export async function pairDevice(
  instanceUrl: string,
  code: string,
  name: string,
): Promise<DeviceCredentials> {
  const response = await doFetch(`${apiBase(instanceUrl)}/devices/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      name,
      platform: devicePlatform(),
      app_version: APP_VERSION,
    }),
  })
  if (!response.ok) {
    throw new ApiError(response.status, 'Pairing failed — the code may be invalid or expired')
  }
  const data = (await response.json()) as PairResponse
  const creds: DeviceCredentials = {
    instanceUrl: instanceUrl.replace(/\/+$/, ''),
    deviceId: data.device_id,
    deviceName: name,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  }
  saveCredentials(creds)
  return creds
}

async function refreshTokens(creds: DeviceCredentials): Promise<DeviceCredentials> {
  const response = await doFetch(`${apiBase(creds.instanceUrl)}/devices/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: creds.refreshToken }),
  })
  if (!response.ok) {
    // Refresh token revoked or expired: the pairing is dead.
    clearCredentials()
    throw new ApiError(response.status, 'Session expired — pair this device again')
  }
  const data = (await response.json()) as PairResponse
  const next: DeviceCredentials = {
    ...creds,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  }
  saveCredentials(next)
  return next
}

export const WORKSPACE_STORAGE_KEY = 'securo_workspace_id'

/** Authenticated request against the paired instance, refreshing tokens once on 401. */
export async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let creds = loadCredentials()
  if (!creds) throw new ApiError(401, 'Not paired')

  const workspaceId = localStorage.getItem(WORKSPACE_STORAGE_KEY)
  const send = (token: string) =>
    doFetch(`${apiBase(creds!.instanceUrl)}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(workspaceId ? { 'X-Workspace-Id': workspaceId } : {}),
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    })

  let response = await send(creds.accessToken)
  if (response.status === 401) {
    creds = await refreshTokens(creds)
    response = await send(creds.accessToken)
  }
  if (!response.ok) {
    throw new ApiError(response.status, `Request failed (${response.status})`)
  }
  return response
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await authedFetch('/users/me')
  return (await response.json()) as CurrentUser
}

export async function sendHeartbeat(deviceId: string): Promise<void> {
  await authedFetch('/devices/heartbeat', {
    method: 'POST',
    body: JSON.stringify({ device_id: deviceId }),
  })
}
