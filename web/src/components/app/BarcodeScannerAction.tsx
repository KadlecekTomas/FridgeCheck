'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, ScanLine, X } from 'lucide-react'
import type { IScannerControls } from '@zxing/browser'
import { normalizeBarcode } from '@/domain/products/openFoodFacts'

function cameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return 'Povol HlídačiJídla přístup ke kameře v nastavení prohlížeče a zkus to znovu.'
    }
    if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
      return 'Na tomto zařízení není dostupná vhodná kamera.'
    }
    if (error.name === 'NotReadableError' || error.name === 'AbortError') {
      return 'Kameru teď používá jiná aplikace nebo ji prohlížeč nedokáže spustit.'
    }
  }

  return 'Kameru se nepodařilo spustit. Čárový kód můžeš pořád opsat ručně.'
}

export function BarcodeScannerAction({
  onDetected,
  disabled = false,
}: {
  onDetected: (barcode: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const detectedRef = useRef(onDetected)

  const stopCamera = () => {
    controlsRef.current?.stop()
    controlsRef.current = null
  }

  const close = () => {
    stopCamera()
    setOpen(false)
    setStarting(false)
    setError(null)
  }

  useEffect(() => {
    detectedRef.current = onDetected
  }, [onDetected])

  useEffect(() => {
    if (!open) return

    let cancelled = false
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      cancelled = true
      controlsRef.current?.stop()
      controlsRef.current = null
      setOpen(false)
      setStarting(false)
      setError(null)
    }

    window.addEventListener('keydown', handleKeyDown)

    void (async () => {
      await Promise.resolve()
      if (cancelled) return

      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError('Kamera vyžaduje zabezpečené HTTPS připojení a podporovaný prohlížeč. Čárový kód můžeš opsat ručně.')
        return
      }

      setStarting(true)
      setError(null)

      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        if (cancelled || !videoRef.current) return

        const reader = new BrowserMultiFormatReader()
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (!result) return

            const barcode = normalizeBarcode(result.getText())
            if (!barcode) return

            controlsRef.current?.stop()
            controlsRef.current = null
            detectedRef.current(barcode)
            setOpen(false)
          }
        )

        if (cancelled) {
          controls.stop()
          return
        }

        controlsRef.current = controls
        setStarting(false)
      } catch (scannerError) {
        if (cancelled) return
        controlsRef.current?.stop()
        controlsRef.current = null
        setStarting(false)
        setError(cameraErrorMessage(scannerError))
      }
    })()

    return () => {
      cancelled = true
      window.removeEventListener('keydown', handleKeyDown)
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        className="button-secondary shrink-0"
        onClick={() => {
          setError(null)
          setOpen(true)
        }}
        disabled={disabled}
      >
        <ScanLine size={17} aria-hidden="true" />
        Skenovat kamerou
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-text/45 p-3 backdrop-blur-[2px] sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) close()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="barcode-scanner-title"
            className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary">Čárový kód</p>
                <h2 id="barcode-scanner-title" className="mt-1 text-xl font-bold tracking-[-0.02em] text-text">
                  Namiř kameru na čárový kód
                </h2>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  Drž obal v klidu a kód celý uvnitř rámečku. Po rozpoznání se kamera sama vypne.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-text-muted hover:bg-surface-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Zavřít skener"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="relative mt-5 aspect-[4/3] overflow-hidden rounded-2xl bg-text">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                muted
                playsInline
                aria-label="Náhled kamery pro čárový kód"
              />
              <div className="pointer-events-none absolute inset-[18%_8%] rounded-2xl border-2 border-white/85 shadow-[0_0_0_999px_rgba(0,0,0,0.18)]" aria-hidden="true" />
              {starting ? (
                <div className="absolute inset-0 flex items-center justify-center bg-text/40 text-sm font-semibold text-white">
                  Spouštím kameru…
                </div>
              ) : null}
            </div>

            {error ? (
              <div className="mt-4 rounded-xl bg-warning/10 p-3" role="status">
                <div className="flex gap-2">
                  <Camera size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
                  <p className="text-sm leading-5 text-text">{error}</p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-center text-sm text-text-muted">Hledám čárový kód…</p>
            )}

            <button type="button" onClick={close} className="button-secondary mt-5 w-full">
              Zavřít a opsat kód ručně
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
