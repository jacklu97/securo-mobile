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
  /** Connectivity/gateway trouble (network error, non-JSON responder, 5xx) as
   *  opposed to a definitive securo rejection. Transient errors must never
   *  destroy local state like the pairing. */
  transient: boolean

  constructor(status: number, message: string, details?: string, transient = false) {
    super(message)
    this.status = status
    this.details = details
    this.transient = transient
  }
}

function looksLikeJson(text: string): boolean {
  try {
    JSON.parse(text)
    return true
  } catch {
    return false
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
  const url = `${apiBase(creds.instanceUrl)}/devices/token`
  let response: Response
  try {
    response = await doFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: creds.refreshToken }),
    })
  } catch (err) {
    throw new ApiError(0, 'Cannot reach the instance', String(err), true)
  }
  const bodyText = await response.text().catch(() => '')
  if (!response.ok) {
    // Only a definitive JSON rejection from securo kills the pairing. A
    // tunnel/proxy answering with an HTML error page (or a 5xx) is
    // connectivity trouble and must leave the credentials intact.
    const definitive =
      [400, 401, 403].includes(response.status) && looksLikeJson(bodyText)
    if (definitive) {
      clearCredentials()
      throw new ApiError(response.status, 'Session expired — pair this device again')
    }
    throw new ApiError(
      response.status,
      'The instance is not reachable right now',
      `POST ${url}\nHTTP ${response.status}\n${bodyText.slice(0, 300)}`,
      true,
    )
  }
  const data = JSON.parse(bodyText) as PairResponse
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
  const send = async (token: string) => {
    try {
      return await doFetch(`${apiBase(creds!.instanceUrl)}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(workspaceId ? { 'X-Workspace-Id': workspaceId } : {}),
          ...init.headers,
          Authorization: `Bearer ${token}`,
        },
      })
    } catch (err) {
      throw new ApiError(0, 'Cannot reach the instance', `${path}\n${String(err)}`, true)
    }
  }

  let response = await send(creds.accessToken)
  if (response.status === 401) {
    const bodyText = await response.text().catch(() => '')
    if (!looksLikeJson(bodyText)) {
      // A non-JSON 401 is a gateway (e.g. a private tunnel), not securo —
      // refreshing against it would falsely kill the pairing.
      throw new ApiError(401, 'The instance is not reachable right now', bodyText.slice(0, 300), true)
    }
    creds = await refreshTokens(creds)
    response = await send(creds.accessToken)
  }
  if (!response.ok) {
    const bodyText = await response.text().catch(() => '')
    const transient = !looksLikeJson(bodyText) || response.status >= 500
    throw new ApiError(
      response.status,
      `Request failed (${response.status})`,
      `${path}\nHTTP ${response.status}\n${bodyText.slice(0, 300)}`,
      transient,
    )
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

/** Rename this device server-side and in the stored credentials. */
export async function renameDevice(deviceId: string, name: string): Promise<void> {
  await authedFetch(`/devices/${deviceId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
  const creds = loadCredentials()
  if (creds) saveCredentials({ ...creds, deviceName: name })
}

/** Revoke this device server-side so it disappears from securo's device manager. */
export async function unpairDevice(deviceId: string): Promise<void> {
  await authedFetch(`/devices/${deviceId}`, { method: 'DELETE' })
}
