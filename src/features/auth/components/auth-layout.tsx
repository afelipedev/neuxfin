'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/ds'

interface AuthLayoutProps {
    children: ReactNode
    title: string
    description: string
    footerText: string
    footerLink: string
    footerLinkText: string
}

export function AuthLayout({
    children,
    title,
    description,
    footerText,
    footerLink,
    footerLinkText,
}: AuthLayoutProps) {
    return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-10">
            <div className="flex w-full max-w-sm flex-col gap-8">
                <Link href="/" aria-label="NeuxFin — início" className="self-center rounded-lg">
                    <Logo />
                </Link>
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2 text-center">
                        <h1 className="text-2xl font-bold">{title}</h1>
                        <p className="text-sm text-balance text-muted-foreground">{description}</p>
                    </div>
                    <div className="grid gap-6">
                        {children}
                    </div>
                    <div className="text-center text-sm text-muted-foreground">
                        {footerText}{' '}
                        <Link href={footerLink} className="font-medium text-brand-1 underline-offset-4 hover:underline">
                            {footerLinkText}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
