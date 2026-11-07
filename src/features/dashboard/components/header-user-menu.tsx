"use client"

import * as React from "react"
import Link from "next/link"
import { LogOut, Moon, Settings, Sparkles, Sun, User } from "lucide-react"
import { useTheme } from "next-themes"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/features/auth/hooks/use-auth"

const supabase = createClient()

interface ProfileSummary {
    nome: string
    email: string
    avatar_url: string | null
}

/** Iniciais do nome (ou do e-mail): "André Felipe" → "AF". */
export function initialsOf(nome: string, email = ""): string {
    const parts = nome.trim().split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return email.slice(0, 2).toUpperCase() || "?"
}

export function HeaderUserMenu() {
    const [profile, setProfile] = React.useState<ProfileSummary | null>(null)
    const { logout } = useAuth()
    const { resolvedTheme, setTheme } = useTheme()
    const isDark = resolvedTheme === "dark"

    React.useEffect(() => {
        let cancelled = false
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user || cancelled) return
            const { data } = await supabase
                .from("perfis")
                .select("nome, email, avatar_url")
                .eq("id", user.id)
                .maybeSingle()
            if (cancelled) return
            setProfile({
                nome: data?.nome ?? "",
                email: data?.email ?? user.email ?? "",
                avatar_url: data?.avatar_url ?? null,
            })
        }
        load().catch(console.error)
        return () => { cancelled = true }
    }, [])

    const nome = profile?.nome || profile?.email || "Minha conta"

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className="ml-1 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/60 pointer-coarse:p-1"
                aria-label="Menu da conta"
            >
                <Avatar className="h-9 w-9 rounded-xl border">
                    {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="" className="object-cover" />}
                    <AvatarFallback className="rounded-xl bg-primary text-primary-foreground text-xs font-bold font-display">
                        {profile ? initialsOf(profile.nome, profile.email) : ""}
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="font-normal">
                    <p className="truncate text-sm font-semibold">{nome}</p>
                    {profile?.email && profile.nome && (
                        <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/configuracoes?tab=perfil"><User className="mr-2 h-4 w-4" />Meu perfil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/configuracoes"><Settings className="mr-2 h-4 w-4" />Configurações</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/configuracoes?tab=ia"><Sparkles className="mr-2 h-4 w-4" />Modelos de IA</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setTheme(isDark ? "light" : "dark")}>
                    {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                    {isDark ? "Tema claro" : "Tema escuro"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => { void logout() }} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />Sair
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
