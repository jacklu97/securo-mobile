import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

interface QrWebScannerProps {
  onScan: (content: string) => void
  onError: (message: string) => void
}

/** Camera-based QR scanner for web/PWA and desktop, using getUserMedia + jsQR. */
export function QrWebScanner({ onScan, onError }: QrWebScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [starting, setStarting] = useState(true)

  useEffect(() => {
    let stream: MediaStream | null = null
    let rafId = 0
    let done = false
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    const tick = () => {
      const video = videoRef.current
      if (done || !video || !ctx) return
      if (video.readyState >= video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0)
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const result = jsQR(image.data, image.width, image.height)
        if (result?.data) {
          done = true
          onScan(result.data)
          return
        }
      }
      rafId = requestAnimationFrame(tick)
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((media) => {
        stream = media
        const video = videoRef.current
        if (!video) return
        video.srcObject = media
        void video.play()
        setStarting(false)
        rafId = requestAnimationFrame(tick)
      })
      .catch(() => {
        onError('Could not access the camera — use manual entry below')
      })

    return () => {
      done = true
      cancelAnimationFrame(rafId)
      stream?.getTracks().forEach((track) => track.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-black">
      <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
      {starting && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
          Starting camera…
        </div>
      )}
      <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-accent/70" />
    </div>
  )
}
