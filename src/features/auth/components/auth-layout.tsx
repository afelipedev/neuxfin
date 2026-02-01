'use client'

import { ReactNode } from 'react'
import Link from 'next/link'

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
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/50 p-6 md:p-10">
            <div className="flex w-full max-w-sm flex-col gap-6">
                <Link href="/" className="flex items-center gap-2 self-center font-medium">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="size-4"
                        >
                            <path d="M12 2v20" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                    </div>
                    NeuxFin.
                </Link>
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2 text-center">
                        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                        <p className="text-sm text-balance text-muted-foreground">{description}</p>
                    </div>
                    <div className="grid gap-6">
                        {children}
                    </div>
                    <div className="text-center text-sm text-muted-foreground">
                        {footerText}{' '}
                        <Link href={footerLink} className="underline underline-offset-4 hover:text-primary">
                            {footerLinkText}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
