import { createHmac } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ServerConfigError } from './admin'

/**
 * Client do Supabase "como o usuário", para rotas de servidor sem cookie de sessão
 * (bot do Telegram, lembretes). Assina um JWT curto com o JWT Secret do projeto:
 * o banco trata a requisição como se fosse o próprio usuário logado, então a RLS
 * isola os dados exatamente como no app. Nunca use para um userId que não veio
 * de um vínculo verificado (telegram_vinculos).
 *
 * Só no servidor: o segredo permite emitir tokens de qualquer usuário.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TOKEN_TTL_SECONDS = 5 * 60

const base64url = (input: Buffer | string) =>
    Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')

/** JWT HS256 com os claims que o Supabase espera de um usuário autenticado. */
export function signUserToken(userId: string, secret: string, nowSeconds = Math.floor(Date.now() / 1000), ttl = TOKEN_TTL_SECONDS): string {
    if (!UUID_RE.test(userId)) throw new Error('Usuário inválido')
    if (!secret) throw new Error('JWT secret ausente')
    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = base64url(JSON.stringify({
        sub: userId,
        role: 'authenticated',
        aud: 'authenticated',
        iat: nowSeconds,
        exp: nowSeconds + ttl,
    }))
    const signature = base64url(createHmac('sha256', secret).update(`${header}.${payload}`).digest())
    return `${header}.${payload}.${signature}`
}

export function createUserScopedClient(userId: string): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const secret = process.env.SUPABASE_JWT_SECRET
    if (!url || !anonKey) throw new ServerConfigError('NEXT_PUBLIC_SUPABASE_URL')
    if (!secret) throw new ServerConfigError('SUPABASE_JWT_SECRET')

    return createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { headers: { Authorization: `Bearer ${signUserToken(userId, secret)}` } },
    })
}
