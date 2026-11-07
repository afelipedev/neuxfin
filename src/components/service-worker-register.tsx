"use client"

import { useEffect } from "react"

/** Registra o service worker do PWA (somente em produção, para não interferir no HMR). */
export function ServiceWorkerRegister() {
    useEffect(() => {
        if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return
        navigator.serviceWorker
            .register("/sw.js", { scope: "/", updateViaCache: "none" })
            .catch((e) => console.error("Falha ao registrar o service worker", e))
    }, [])
    return null
}
