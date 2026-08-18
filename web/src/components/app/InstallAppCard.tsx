'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Download, Share2, Smartphone } from 'lucide-react'

type StandaloneNavigator = Navigator & { standalone?: boolean }

function detectInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as StandaloneNavigator).standalone)
  )
}

function detectIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function InstallAppCard() {
  const [installed, setInstalled] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    let cancelled = false

    void Promise.resolve().then(() => {
      if (cancelled) return
      setInstalled(detectInstalled())
      setIos(detectIOS())
    })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="rounded-2xl border border-primary/15 bg-primary-soft/30 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
          <Smartphone size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-text">HlídačJídla jako aplikace</h2>
          {installed ? (
            <div className="mt-2 flex items-center gap-2 text-sm font-medium text-primary" aria-live="polite">
              <CheckCircle2 size={17} aria-hidden="true" />
              Je otevřený jako aplikace z plochy.
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Přidej si HlídačJídla na plochu. Otevře se bez lišty prohlížeče a bude působit jako běžná mobilní aplikace.
              </p>
              <div className="mt-4 rounded-xl border border-border bg-surface p-4">
                <div className="flex gap-3">
                  {ios ? (
                    <Share2 size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                  ) : (
                    <Download size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                  )}
                  <div className="text-sm leading-6 text-text">
                    {ios ? (
                      <>
                        V Safari klepni na <strong>Sdílet</strong> a potom <strong>Přidat na plochu</strong>.
                      </>
                    ) : (
                      <>
                        V menu prohlížeče zvol <strong>Instalovat aplikaci</strong> nebo <strong>Přidat na plochu</strong>.
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
