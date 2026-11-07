import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
    return {
        id: "/",
        name: "NeuxFin — Gestão Financeira",
        short_name: "NeuxFin",
        description: "Finanças PF e PJ com análise por IA: saldo, contas, cartões e cofrinhos.",
        lang: "pt-BR",
        start_url: "/dashboard",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0b0b0f",
        theme_color: "#0b0b0f",
        categories: ["finance", "productivity"],
        icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
            { name: "Despesas", url: "/despesas", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
            { name: "Receitas", url: "/receitas", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
            { name: "Cartões", url: "/cartoes", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
        ],
    }
}
