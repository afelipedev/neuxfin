import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export type Category = {
    id: string
    usuario_id: string | null
    nome: string
    icone: string | null
    cor: string | null
    tipo: 'receita' | 'despesa'
    created_at: string
}

export type BankAccount = {
    id: string
    usuario_id: string
    nome: string
    instituicao: string | null
    tipo: 'corrente' | 'poupanca' | 'investimento' | 'dinheiro' | 'outros'
    saldo_inicial: number
    cor: string | null
    created_at: string
}

export type CreditCard = {
    id: string
    usuario_id: string
    nome: string
    bandeira: string | null
    limite: number
    dia_vencimento: number
    dia_fechamento: number
    cor: string | null
    created_at: string
}

export const settingsService = {
    // Categories
    async getCategories() {
        const { data, error } = await supabase
            .from('categorias')
            .select('*')
            .order('nome')
        if (error) throw error
        return data as Category[]
    },

    async createCategory(category: Omit<Category, 'id' | 'usuario_id' | 'created_at'>) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Usuário não autenticado")

        const { data, error } = await supabase
            .from('categorias')
            .insert([{ ...category, usuario_id: user.id }])
            .select()
            .single()
        if (error) throw error
        return data as Category
    },

    async deleteCategory(id: string) {
        const { error } = await supabase
            .from('categorias')
            .delete()
            .eq('id', id)
        if (error) throw error
    },

    async updateCategory(id: string, category: Partial<Omit<Category, 'id' | 'usuario_id' | 'created_at'>>) {
        const { data, error } = await supabase
            .from('categorias')
            .update(category)
            .eq('id', id)
            .select()
            .single()
        if (error) throw error
        return data as Category
    },

    // Bank Accounts
    async getBankAccounts() {
        const { data, error } = await supabase
            .from('contas_bancarias')
            .select('*')
            .order('nome')
        if (error) throw error
        return data as BankAccount[]
    },

    async createBankAccount(account: Omit<BankAccount, 'id' | 'usuario_id' | 'created_at'>) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Usuário não autenticado")

        const { data, error } = await supabase
            .from('contas_bancarias')
            .insert([{ ...account, usuario_id: user.id }])
            .select()
            .single()
        if (error) throw error
        return data as BankAccount
    },

    async deleteBankAccount(id: string) {
        const { error } = await supabase
            .from('contas_bancarias')
            .delete()
            .eq('id', id)
        if (error) throw error
    },

    async updateBankAccount(id: string, account: Partial<Omit<BankAccount, 'id' | 'usuario_id' | 'created_at'>>) {
        const { data, error } = await supabase
            .from('contas_bancarias')
            .update(account)
            .eq('id', id)
            .select()
            .single()
        if (error) throw error
        return data as BankAccount
    },

    // Credit Cards
    async getCreditCards() {
        const { data, error } = await supabase
            .from('cartoes_credito')
            .select('*')
            .order('nome')
        if (error) throw error
        return data as CreditCard[]
    },

    async createCreditCard(card: Omit<CreditCard, 'id' | 'usuario_id' | 'created_at'>) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Usuário não autenticado")

        const { data, error } = await supabase
            .from('cartoes_credito')
            .insert([{ ...card, usuario_id: user.id }])
            .select()
            .single()
        if (error) throw error
        return data as CreditCard
    },

    async deleteCreditCard(id: string) {
        const { error } = await supabase
            .from('cartoes_credito')
            .delete()
            .eq('id', id)
        if (error) throw error
    },

    async updateCreditCard(id: string, card: Partial<Omit<CreditCard, 'id' | 'usuario_id' | 'created_at'>>) {
        const { data, error } = await supabase
            .from('cartoes_credito')
            .update(card)
            .eq('id', id)
            .select()
            .single()
        if (error) throw error
        return data as CreditCard
    }
}
