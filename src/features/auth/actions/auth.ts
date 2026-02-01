'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function login(formData: FormData) {
    const supabase = await createClient()

    // Validate fields
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    const origin = (await headers()).get('origin')
    // revalidatePath('/', 'layout') // Optional: clear cache
    redirect('/')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    // Validate fields
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const name = formData.get('name') as string

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
            },
            // If we need email verification, use window.location.origin
            // emailRedirectTo: `${origin}/auth/callback`,
        },
    })

    if (error) {
        return { error: error.message }
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
    return { success: true, message: 'Check your email to verify your account.' }
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}
