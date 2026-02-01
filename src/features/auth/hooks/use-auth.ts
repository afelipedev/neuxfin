import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function useAuth() {
    const router = useRouter()
    const supabase = createClient()

    const logout = async () => {
        try {
            const { error } = await supabase.auth.signOut()

            if (error) {
                throw error
            }

            toast.success('Logout realizado com sucesso!')
            router.push('/login')
        } catch (error: any) {
            console.error('Erro ao fazer logout:', error)
            toast.error('Erro ao fazer logout. Tente novamente.')
        }
    }

    return {
        logout
    }
}
