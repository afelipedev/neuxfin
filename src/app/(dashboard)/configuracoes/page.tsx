"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tag, Landmark, CreditCard, User, Sparkles } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CategoriesSettings } from "@/features/settings/components/categories-settings"
import { AccountsSettings } from "@/features/settings/components/accounts-settings"
import { CardsSettings } from "@/features/settings/components/cards-settings"
import { ProfileSettings } from "@/features/settings/components/profile-settings"
import { AIModelsSettings } from "@/features/ai-models/components/ai-models-settings"

const TABS = [
    { value: "categorias", label: "Categorias", icon: Tag },
    { value: "contas", label: "Contas Bancárias", icon: Landmark },
    { value: "cartoes", label: "Cartões de Crédito", icon: CreditCard },
    { value: "ia", label: "IA", icon: Sparkles },
    { value: "perfil", label: "Perfil", icon: User },
] as const

const triggerClass = "flex-none data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-4 sm:px-6 transition-all"

function SettingsTabs() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const requested = searchParams.get("tab")
    const tab = TABS.some(t => t.value === requested) ? requested! : "categorias"

    return (
        <Tabs
            value={tab}
            onValueChange={(value) => router.replace(`/configuracoes?tab=${value}`, { scroll: false })}
            className="space-y-6"
        >
            <div className="-mx-2 px-2 overflow-x-auto">
                <TabsList className="bg-zinc-900/5 dark:bg-zinc-100/5 border-none p-1 h-12 min-w-max">
                    {TABS.map(t => (
                        <TabsTrigger key={t.value} value={t.value} className={triggerClass}>
                            <t.icon className="mr-2 h-4 w-4" />
                            {t.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </div>

            <TabsContent value="categorias" className="border-none p-0 outline-none">
                <CategoriesSettings />
            </TabsContent>
            <TabsContent value="contas" className="border-none p-0 outline-none">
                <AccountsSettings />
            </TabsContent>
            <TabsContent value="cartoes" className="border-none p-0 outline-none">
                <CardsSettings />
            </TabsContent>
            <TabsContent value="ia" className="border-none p-0 outline-none">
                <AIModelsSettings />
            </TabsContent>
            <TabsContent value="perfil" className="border-none p-0 outline-none">
                <ProfileSettings />
            </TabsContent>
        </Tabs>
    )
}

export default function SettingsPage() {
    return (
        <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
                <p className="text-sm text-muted-foreground">Gerencie suas categorias, contas, cartões e modelos de IA</p>
            </div>
            <Suspense fallback={null}>
                <SettingsTabs />
            </Suspense>
        </div>
    )
}
