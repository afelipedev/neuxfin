'use client'

import { LoginForm } from '@/features/auth/components/login-form'
import { AuthLayout } from '@/features/auth/components/auth-layout'

export default function LoginPage() {
    return (
        <AuthLayout
            title="Bem vindo de volta"
            description="Entre com seu email para acessar sua conta"
            footerText="Não tem uma conta?"
            footerLink="/register"
            footerLinkText="Cadastre-se"
        >
            <LoginForm />
        </AuthLayout>
    )
}
