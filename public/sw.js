/*
 * Service worker do NeuxFin.
 *
 * Estratégia conservadora para um app financeiro:
 * - Dados (Supabase, /api/*) NUNCA são cacheados: saldo velho é pior que nenhum saldo.
 * - Navegações: rede primeiro; sem conexão, mostra /offline.html.
 * - Assets estáticos versionados do Next (/_next/static) e ícones: cache-first.
 */
const VERSION = "neuxfin-v2"
const STATIC_CACHE = `${VERSION}-static`
const OFFLINE_URL = "/offline.html"
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"]

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)))
    self.skipWaiting()
})

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)))
        )
    )
    self.clients.claim()
})

self.addEventListener("fetch", (event) => {
    const { request } = event
    if (request.method !== "GET") return

    const url = new URL(request.url)
    if (url.origin !== self.location.origin) return
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return

    if (request.mode === "navigate") {
        event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)))
        return
    }

    if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
        event.respondWith(
            caches.match(request).then(
                (cached) =>
                    cached ||
                    fetch(request).then((response) => {
                        if (response.ok) {
                            const copy = response.clone()
                            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
                        }
                        return response
                    })
            )
        )
    }
})
