"use client"

import { Settings, Tag, Landmark, CreditCard, User } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CategoriesSettings } from "@/features/settings/components/categories-settings"
import { AccountsSettings } from "@/features/settings/components/accounts-settings"
import { CardsSettings } from "@/features/settings/components/cards-settings"
import { ProfileSettings } from "@/features/settings/components/profile-settings"

export default function SettingsPage() {
    return (
        <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
                <p className="text-sm text-muted-foreground">Gerencie suas categorias, contas bancárias e cartões de crédito</p>
            </div>

            <Tabs defaultValue="categorias" className="space-y-6">
                <TabsList className="bg-zinc-900/5 dark:bg-zinc-100/5 border-none p-1 h-12">
                    <TabsTrigger value="categorias" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-6 transition-all">
                        <Tag className="mr-2 h-4 w-4" />
                        Categorias
                    </TabsTrigger>
                    <TabsTrigger value="contas" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-6 transition-all">
                        <Landmark className="mr-2 h-4 w-4" />
                        Contas Bancárias
                    </TabsTrigger>
                    <TabsTrigger value="cartoes" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-6 transition-all">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Cartões de Crédito
                    </TabsTrigger>
                    <TabsTrigger value="perfil" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-6 transition-all">
                        <User className="mr-2 h-4 w-4" />
                        Perfil
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="categorias" className="border-none p-0 outline-none">
                    <CategoriesSettings />
                </TabsContent>

                <TabsContent value="contas" className="border-none p-0 outline-none">
                    <AccountsSettings />
                </TabsContent>

                <TabsContent value="cartoes" className="border-none p-0 outline-none">
                    <CardsSettings />
                </TabsContent>

                <TabsContent value="perfil" className="border-none p-0 outline-none">
                    <ProfileSettings />
                </TabsContent>
            </Tabs>
        </div>
    )
}
