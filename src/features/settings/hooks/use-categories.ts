import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Category {
    id: string
    nome: string
    tipo: 'receita' | 'despesa'
    icone?: string
    cor?: string
}

export function useCategories() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadCategories() {
            try {
                setLoading(true)
                const supabase = createClient()
                const { data, error } = await supabase
                    .from('categorias')
                    .select('*')
                    .order('nome')

                if (error) throw error
                setCategories(data || [])
            } catch (e) {
                console.error('Erro ao carregar categorias:', e)
            } finally {
                setLoading(false)
            }
        }

        loadCategories()
    }, [])

    return { categories, loading }
}
