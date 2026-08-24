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
  /** Raw diagnostics (URL, status, response body / network error) for debugging. */
  details?: string

  constructor(status: number, message: string, details?: string) {
    super(message)
    this.status = status
    this.details = details
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
  const url = `${apiBase(instanceUrl)}/devices/pair`
  let response: Response
  try {
    response = await doFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        name,
        platform: devicePlatform(),
        app_version: APP_VERSION,
      }),
    })
  } catch (err) {
    throw new ApiError(
      0,
      'Could not reach the instance — check the URL and that it is reachable from this device',
      `POST ${url}\n${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`,
    )
  }
  const bodyText = await response.text().catch(() => '')
  if (!response.ok) {
    // Non-2xx often isn't securo at all (tunnel auth pages, proxies) — keep
    // the raw body so the real responder is identifiable.
    throw new ApiError(
      response.status,
      response.status === 400
        ? 'Pairing failed — the code may be invalid or expired'
        : `Pairing failed — the instance answered HTTP ${response.status}`,
      `POST ${url}\nHTTP ${response.status}\n${bodyText.slice(0, 800)}`,
    )
  }
  let data: PairResponse
  try {
    data = JSON.parse(bodyText) as PairResponse
  } catch {
    // 200 but not JSON: something (e.g. a tunnel interstitial) intercepted us.
    throw new ApiError(
      response.status,
      'The URL responded, but not with a Securo pairing response',
      `POST ${url}\nHTTP ${response.status}\n${bodyText.slice(0, 800)}`,
    )
  }
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

/** Revoke this device server-side so it disappears from securo's device manager. */
export async function unpairDevice(deviceId: string): Promise<void> {
  await authedFetch(`/devices/${deviceId}`, { method: 'DELETE' })
}
