import { createClient } from '@supabase/supabase-js'

/** Variável de ambiente obrigatória ausente no servidor. */
export class ServerConfigError extends Error {
    constructor(public readonly variable: string) {
        super(`Servidor sem a variável ${variable}. Adicione ao .env (ou nas variáveis da Vercel) e reinicie.`)
        this.name = 'ServerConfigError'
    }
}

/**
 * Cliente service-role (ignora RLS). Use somente em rotas de servidor e sempre
 * filtrando pelo usuário explicitamente. Nunca importe em componentes client.
 */
export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new ServerConfigError('SUPABASE_SERVICE_ROLE_KEY')
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
