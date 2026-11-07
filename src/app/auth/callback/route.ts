import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeNextPath } from '@/features/auth/password-policy'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // Só caminhos internos: impede open redirect (ex.: next=@site-malicioso.com)
    const next = safeNextPath(searchParams.get('next'))

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === 'development'
            if (isLocalEnv) {
                // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
                return NextResponse.redirect(`${origin}${next}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`)
            } else {
                return NextResponse.redirect(`${origin}${next}`)
            }
        }
    }

    // Link inválido ou expirado: volta para o login com aviso
    return NextResponse.redirect(`${origin}/login?erro=link`)
}
