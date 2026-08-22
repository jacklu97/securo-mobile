import { isTauri } from '@tauri-apps/api/core'
import type { DevicePlatform } from './types'

export { isTauri }

export function devicePlatform(): DevicePlatform {
  const ua = navigator.userAgent
  if (/android/i.test(ua)) return 'android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  return 'other'
}

/** Native QR scanning is only available through the Tauri mobile plugin. */
export function hasNativeScanner(): boolean {
  return isTauri() && devicePlatform() !== 'other'
}

/**
 * Best-effort friendly name: the OS hostname on native builds (Android often
 * reports the user-visible device name there), falling back to a generic one.
 */
export async function suggestedDeviceName(): Promise<string | null> {
  if (!isTauri()) return null
  try {
    const os = await import('@tauri-apps/plugin-os')
    const name = await os.hostname()
    if (name && name.trim() && name !== 'localhost') return name.trim()
  } catch {
    // plugin unavailable — caller keeps the default
  }
  return null
}

export function defaultDeviceName(): string {
  switch (devicePlatform()) {
    case 'android':
      return 'Android device'
    case 'ios':
      return 'iPhone'
    default:
      return isTauri() ? 'Desktop app' : 'Web browser'
  }
}
