import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Dev roda com Webpack (`next dev --webpack`), mais estável com Tailwind CSS v4.
    // Raiz fixa: existe um package-lock.json na pasta pessoal que confundia a detecção do workspace.
    turbopack: {
        root: path.resolve(__dirname),
    },
    poweredByHeader: false,
    async headers() {
        return [
            {
                // Cabeçalhos de segurança em todas as respostas
                source: "/:path*",
                headers: [
                    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
                    { key: "X-Frame-Options", value: "DENY" },
                    { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
                    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
                ],
            },
            {
                // PWA: o service worker nunca fica em cache, para atualizar sempre
                source: "/sw.js",
                headers: [
                    { key: "Content-Type", value: "application/javascript; charset=utf-8" },
                    { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
                    { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
                ],
            },
        ];
    },
};

export default nextConfig;
