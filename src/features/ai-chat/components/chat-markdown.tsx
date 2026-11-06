"use client"

import * as React from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

/** Elementos estilizados para o balão do chat (sem HTML cru: react-markdown não renderiza HTML por padrão). */
const components: Components = {
    p: ({ children }) => <p className="leading-relaxed [&:not(:first-child)]:mt-2">{children}</p>,
    strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    // Lista não ordenada com marcador na cor da marca
    ul: ({ children }) => (
        <ul className="mt-2 space-y-1 [&>li]:relative [&>li]:pl-4 [&>li]:before:absolute [&>li]:before:left-0.5 [&>li]:before:top-[0.6em] [&>li]:before:h-1.5 [&>li]:before:w-1.5 [&>li]:before:rounded-full [&>li]:before:bg-brand-1 [&>li]:before:content-['']">
            {children}
        </ul>
    ),
    ol: ({ children }) => <ol className="mt-2 list-decimal space-y-1 pl-5 marker:text-muted-foreground">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed [&>ul]:mt-1">{children}</li>,
    h1: ({ children }) => <p className="mt-3 first:mt-0 font-bold">{children}</p>,
    h2: ({ children }) => <p className="mt-3 first:mt-0 font-bold">{children}</p>,
    h3: ({ children }) => <p className="mt-3 first:mt-0 font-semibold">{children}</p>,
    a: ({ children, href }) => (
        <a href={href} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">{children}</a>
    ),
    code: ({ children }) => <code className="rounded bg-background/60 px-1 py-0.5 font-mono text-[0.85em]">{children}</code>,
    blockquote: ({ children }) => <blockquote className="mt-2 border-l-2 border-brand-1 pl-3 text-muted-foreground">{children}</blockquote>,
    hr: () => <hr className="my-3 border-border" />,
    table: ({ children }) => (
        <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">{children}</table>
        </div>
    ),
    th: ({ children }) => <th className="border-b border-border px-2 py-1 text-left font-semibold">{children}</th>,
    td: ({ children }) => <td className="border-b border-border/50 px-2 py-1 tabular-nums">{children}</td>,
}

export function ChatMarkdown({ text, className }: { text: string; className?: string }) {
    return (
        <div className={cn("break-words", className)}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {text}
            </ReactMarkdown>
        </div>
    )
}
