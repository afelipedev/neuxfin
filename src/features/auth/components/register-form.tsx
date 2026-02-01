'use client'

import { useState } from 'react'
import { signup } from '@/features/auth/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function RegisterForm() {
    const [loading, setLoading] = useState(false)

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)

        const formData = new FormData(event.currentTarget)

        // Simple client validation could go here, e.g. password match
        const password = formData.get('password')
        const confirmPassword = formData.get('confirm-password')

        if (password !== confirmPassword) {
            toast.error('As senhas não coincidem')
            setLoading(false)
            return
        }

        const result = await signup(formData)

        if (result?.error) {
            toast.error(result.error)
            setLoading(false)
        } else if (result?.success) {
            toast.success(result.message)
            setLoading(false) // Keep them here to see message, or redirect if creating session immediately
        }
    }

    return (
        <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="João Silva"
                    required
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" name="password" type="password" required />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirmar Senha</Label>
                <Input id="confirm-password" name="confirm-password" type="password" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar conta
            </Button>
        </form>
    )
}
