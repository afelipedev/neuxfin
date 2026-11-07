'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { authErrorMessage, passwordProblem } from '../password-policy'

export async function login(formData: FormData) {
    const supabase = await createClient()

    // Validate fields
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) return { error: 'Informe e-mail e senha.' }

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: authErrorMessage(error) }
    }

    // revalidatePath('/', 'layout') // Optional: clear cache
    redirect('/')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    // Validate fields
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const name = formData.get('name') as string

    // Mesma política configurada no Supabase (validada lá também)
    const problem = passwordProblem(password ?? '')
    if (problem) return { error: problem }

    // Link de confirmação de e-mail volta para o callback do próprio app
    const h = await headers()
    const host = h.get('x-forwarded-host') ?? h.get('host')
    const proto = h.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https')
    const origin = host ? `${proto}://${host}` : undefined

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
            },
            emailRedirectTo: origin ? `${origin}/auth/callback?next=/dashboard` : undefined,
        },
    })

    if (error) {
        return { error: authErrorMessage(error) }
    }

    // If email confirmation is disabled in Supabase, valid session is created immediately
    // If enabled, user is technically not fully logged in until they verify
    // For now, we assume simple flow or display "Check your email"

    // If session exists immediately (email confirm off), redirect
    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
        redirect('/')
    }

    // Otherwise return success to show message
    return { success: true, message: 'Conta criada! Enviamos um link de confirmação para o seu e-mail.' }
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}
