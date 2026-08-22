import { useState } from 'react'
import { pairDevice, parseQrPayload } from '../lib/api'
import { defaultDeviceName, hasNativeScanner } from '../lib/platform'
import type { DeviceCredentials } from '../lib/types'
import { QrWebScanner } from './QrWebScanner'

interface PairScreenProps {
  onPaired: (creds: DeviceCredentials) => void
}

export function PairScreen({ onPaired }: PairScreenProps) {
  const [deviceName, setDeviceName] = useState(defaultDeviceName())
  const [scanning, setScanning] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [manualUrl, setManualUrl] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pair = async (url: string, code: string) => {
    setBusy(true)
    setError(null)
    try {
      onPaired(await pairDevice(url, code, deviceName.trim() || defaultDeviceName()))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pairing failed')
    } finally {
      setBusy(false)
    }
  }

  const handleScanContent = (content: string) => {
    setScanning(false)
    try {
      const payload = parseQrPayload(content)
      void pair(payload.url, payload.code)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid QR code')
    }
  }

  const handleNativeScan = async () => {
    setError(null)
    try {
      const scanner = await import('@tauri-apps/plugin-barcode-scanner')
      let permission = await scanner.checkPermissions()
      if (permission === 'prompt') {
        permission = await scanner.requestPermissions()
      }
      if (permission !== 'granted') {
        setError('Camera permission denied — use manual entry below')
        return
      }
      const result = await scanner.scan({ windowed: false, formats: [scanner.Format.QRCode] })
      handleScanContent(result.content)
    } catch {
      setError('Scan cancelled or failed — try again or use manual entry')
    }
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <img src="/pwa-192.png" alt="" className="mx-auto mb-4 size-20 rounded-2xl" />
        <h1 className="text-2xl font-semibold text-white">Pair with Securo</h1>
        <p className="mt-2 text-sm text-slate-400">
          Open <span className="text-slate-200">Settings → Devices</span> on your Securo instance
          and scan the pairing QR code.
        </p>
      </div>

      <label className="block text-left">
        <span className="mb-1.5 block text-sm text-slate-300">This device's name</span>
        <input
          value={deviceName}
          onChange={(event) => setDeviceName(event.target.value)}
          maxLength={100}
          className="w-full rounded-xl border border-slate-700 bg-surface px-4 py-3 text-white outline-none focus:border-accent"
        />
      </label>

      {scanning ? (
        <div className="space-y-3">
          <QrWebScanner onScan={handleScanContent} onError={(message) => { setScanning(false); setError(message); setShowManual(true) }} />
          <button
            type="button"
            onClick={() => setScanning(false)}
            className="w-full rounded-xl border border-slate-700 py-3 text-slate-300"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => (hasNativeScanner() ? void handleNativeScan() : setScanning(true))}
          className="w-full rounded-xl bg-accent py-3.5 font-semibold text-slate-900 disabled:opacity-50"
        >
          {busy ? 'Pairing…' : 'Scan QR code'}
        </button>
      )}

      <button
        type="button"
        onClick={() => setShowManual((value) => !value)}
        className="text-sm text-slate-400 underline-offset-4 hover:underline"
      >
        {showManual ? 'Hide manual entry' : 'Enter code manually instead'}
      </button>

      {showManual && (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            void pair(manualUrl.trim(), manualCode.trim())
          }}
        >
          <input
            value={manualUrl}
            onChange={(event) => setManualUrl(event.target.value)}
            placeholder="https://securo.example.com"
            type="url"
            required
            className="w-full rounded-xl border border-slate-700 bg-surface px-4 py-3 text-white outline-none focus:border-accent"
          />
          <input
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            placeholder="Pairing code"
            required
            className="w-full rounded-xl border border-slate-700 bg-surface px-4 py-3 text-white outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl border border-accent py-3 font-semibold text-accent disabled:opacity-50"
          >
            Pair manually
          </button>
        </form>
      )}

      {error && (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
