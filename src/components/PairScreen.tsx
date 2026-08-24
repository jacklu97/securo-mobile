import { useTranslation } from 'react-i18next'
import { useEffect, useRef, useState } from 'react'
import { ApiError, pairDevice, parseQrPayload } from '../lib/api'
import { defaultDeviceName, hasNativeScanner, isTauri, suggestedDeviceName } from '../lib/platform'
import type { DeviceCredentials } from '../lib/types'
import { QrWebScanner } from './QrWebScanner'

interface PairScreenProps {
  onPaired: (creds: DeviceCredentials) => void
}

export function PairScreen({ onPaired }: PairScreenProps) {
  const { t } = useTranslation()
  const [deviceName, setDeviceName] = useState(defaultDeviceName())
  const [scanning, setScanning] = useState(false)
  const [showManual, setShowManual] = useState(false)
  // Web flavor always pairs against its own origin (see pairDevice).
  const [manualUrl, setManualUrl] = useState(() => (isTauri() ? '' : window.location.origin))
  const [manualCode, setManualCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const [nativeScanning, setNativeScanning] = useState(false)
  const scanCancelledRef = useRef(false)
  const nameTouchedRef = useRef(false)

  // Pre-fill the device name with the OS-reported hostname (often the name
  // the user gave the phone), unless they already typed their own.
  useEffect(() => {
    suggestedDeviceName().then((name) => {
      if (name && !nameTouchedRef.current) setDeviceName(name)
    })
  }, [])

  // The windowed scanner renders the camera behind the webview, so every
  // layer above it has to become transparent while scanning.
  useEffect(() => {
    document.documentElement.classList.toggle('qr-scan', nativeScanning)
    return () => document.documentElement.classList.remove('qr-scan')
  }, [nativeScanning])

  const pair = async (url: string, code: string) => {
    setBusy(true)
    setError(null)
    setErrorDetails(null)
    try {
      onPaired(await pairDevice(url, code, deviceName.trim() || defaultDeviceName()))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pairing failed')
      setErrorDetails(err instanceof ApiError ? (err.details ?? null) : null)
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
      setErrorDetails(`Scanned content:\n${content.slice(0, 400)}`)
    }
  }

  const handleNativeScan = async () => {
    setError(null)
    setErrorDetails(null)
    scanCancelledRef.current = false
    try {
      const scanner = await import('@tauri-apps/plugin-barcode-scanner')
      let permission = await scanner.checkPermissions()
      if (permission === 'prompt') {
        permission = await scanner.requestPermissions()
      }
      if (permission !== 'granted') {
        setError(t('pair.cameraDenied'))
        return
      }
      setNativeScanning(true)
      const result = await scanner.scan({ windowed: true, formats: [scanner.Format.QRCode] })
      setNativeScanning(false)
      handleScanContent(result.content)
    } catch {
      if (!scanCancelledRef.current) {
        setError(t('pair.scanFailed'))
      }
    } finally {
      setNativeScanning(false)
    }
  }

  const cancelNativeScan = async () => {
    scanCancelledRef.current = true
    try {
      const scanner = await import('@tauri-apps/plugin-barcode-scanner')
      await scanner.cancel()
    } catch {
      // scan promise settles either way
    }
    setNativeScanning(false)
  }

  if (nativeScanning) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center">
        <p className="mb-8 rounded-full bg-black/60 px-5 py-2.5 text-sm font-medium text-white">
          {t('pair.pointAtQr')}
        </p>
        {/* Transparent window: the shadow dims everything outside it while the
            camera stays visible through the center. */}
        <div
          className="size-64 rounded-3xl border-2 border-primary"
          style={{ boxShadow: '0 0 0 200vmax rgba(0, 0, 0, 0.55)' }}
        />
        <button
          type="button"
          onClick={() => void cancelNativeScan()}
          className="mt-10 rounded-full bg-black/60 px-7 py-2.5 text-sm text-white"
        >
          {t('common.cancel')}
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <img src="/pwa-192.png" alt="" className="mx-auto mb-4 size-20 rounded-2xl" />
        <h1 className="text-2xl font-semibold text-foreground">{t('pair.title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('pair.subtitle')}
        </p>
      </div>

      <label className="block text-left">
        <span className="mb-1.5 block text-sm text-muted-foreground">{t('pair.deviceName')}</span>
        <input
          value={deviceName}
          onChange={(event) => {
            nameTouchedRef.current = true
            setDeviceName(event.target.value)
          }}
          maxLength={100}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground outline-none focus:border-primary"
        />
      </label>

      {scanning ? (
        <div className="space-y-3">
          <QrWebScanner onScan={handleScanContent} onError={(message) => { setScanning(false); setError(message); setShowManual(true) }} />
          <button
            type="button"
            onClick={() => setScanning(false)}
            className="w-full rounded-xl border border-border py-3 text-muted-foreground"
          >
            {t('common.cancel')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => (hasNativeScanner() ? void handleNativeScan() : setScanning(true))}
          className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? t('pair.pairing') : t('pair.scanQr')}
        </button>
      )}

      <button
        type="button"
        onClick={() => setShowManual((value) => !value)}
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        {showManual ? t('pair.hideManual') : t('pair.showManual')}
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
            readOnly={!isTauri()}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground outline-none focus:border-primary"
          />
          <input
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            placeholder={t('pair.codePlaceholder')}
            required
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl border border-primary py-3 font-semibold text-primary disabled:opacity-50"
          >
            {t('pair.pairManually')}
          </button>
        </form>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p>{error}</p>
          {errorDetails && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs opacity-80">{t('pair.showDetails')}</summary>
              <pre className="mt-2 max-h-48 select-text overflow-auto whitespace-pre-wrap break-all rounded-lg bg-black/20 p-2 text-left font-mono text-[11px] leading-snug">
                {errorDetails}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
