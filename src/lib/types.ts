export interface QrPayload {
  v: number
  url: string
  code: string
}

export interface DeviceCredentials {
  instanceUrl: string
  deviceId: string
  deviceName: string
  accessToken: string
  refreshToken: string
}

export interface PairResponse {
  device_id: string
  refresh_token: string
  access_token: string
  token_type: string
}

export interface CurrentUser {
  id: string
  email: string
  name?: string | null
}

export type DevicePlatform = 'ios' | 'android' | 'other'
