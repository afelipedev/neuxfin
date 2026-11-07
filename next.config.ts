import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Dev roda com Webpack (`next dev --webpack`), mais estável com Tailwind CSS v4.
    // Raiz fixa: existe um package-lock.json na pasta pessoal que confundia a detecção do workspace.
    turbopack: {
        root: path.resolve(__dirname),
    },
    async headers() {
        return [
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
