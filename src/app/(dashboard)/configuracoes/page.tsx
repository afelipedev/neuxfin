"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tag, Landmark, CreditCard, User, Sparkles, Send } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CategoriesSettings } from "@/features/settings/components/categories-settings"
import { AccountsSettings } from "@/features/settings/components/accounts-settings"
import { CardsSettings } from "@/features/settings/components/cards-settings"
import { ProfileSettings } from "@/features/settings/components/profile-settings"
import { AIModelsSettings } from "@/features/ai-models/components/ai-models-settings"
import { TelegramSettings } from "@/features/telegram/components/telegram-settings"
import { PageHeader } from "@/components/ds"

const TABS = [
    { value: "categorias", label: "Categorias", icon: Tag },
    { value: "contas", label: "Contas", icon: Landmark },
    { value: "cartoes", label: "Cartões", icon: CreditCard },
    { value: "ia", label: "IA", icon: Sparkles },
    { value: "telegram", label: "Telegram", icon: Send },
    { value: "perfil", label: "Perfil", icon: User },
] as const

const triggerClass = "flex-none gap-2 rounded-md px-3 sm:px-4"

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
            {/* Rolagem horizontal no mobile; abas nunca quebram linha */}
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <TabsList className="h-11 min-w-max">
                    {TABS.map(t => (
                        <TabsTrigger key={t.value} value={t.value} className={triggerClass}>
                            <t.icon className="h-4 w-4" aria-hidden="true" />
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
            <TabsContent value="telegram" className="border-none p-0 outline-none">
                <TelegramSettings />
            </TabsContent>
            <TabsContent value="perfil" className="border-none p-0 outline-none">
                <ProfileSettings />
            </TabsContent>
        </Tabs>
    )
}

export default function SettingsPage() {
    return (
        <div className="space-y-6 sm:space-y-8">
            <PageHeader title="Configurações" description="Categorias, contas, cartões, IA, Telegram e perfil" />
            <Suspense fallback={null}>
                <SettingsTabs />
            </Suspense>
        </div>
    )
}
