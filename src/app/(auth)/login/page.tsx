'use client'

import { use } from 'react'
import { LoginForm } from '@/features/auth/components/login-form'
import { AuthLayout } from '@/features/auth/components/auth-layout'

export default function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
    const { erro } = use(searchParams)
    return (
        <AuthLayout
            title="Bem-vindo de volta"
            description="Entre com seu e-mail para acessar sua conta"
            footerText="Não tem uma conta?"
            footerLink="/register"
            footerLinkText="Cadastre-se"
        >
            {erro === 'link' && (
                <p role="alert" className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    O link expirou ou já foi usado. Entre com e-mail e senha ou cadastre-se de novo.
                </p>
            )}
            <LoginForm />
        </AuthLayout>
    )
}
