import { RegisterForm } from '@/features/auth/components/register-form'
import { AuthLayout } from '@/features/auth/components/auth-layout'

export default function RegisterPage() {
    return (
        <AuthLayout
            title="Criar conta"
            description="Preencha os dados abaixo para criar sua conta"
            footerText="Já tem uma conta?"
            footerLink="/login"
            footerLinkText="Entre"
        >
            <RegisterForm />
        </AuthLayout>
    )
}
