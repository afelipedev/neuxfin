"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    ArrowUpRight,
    ArrowDownRight,
    Repeat,
    Wallet,
    PieChart,
    Settings,
    Calculator,
    MessageSquare,
    LogOut
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
} from "@/components/ui/sidebar"

import { useAuth } from "@/features/auth/hooks/use-auth"

const items = [
    {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Receitas",
        url: "/receitas",
        icon: ArrowUpRight,
    },
    {
        title: "Despesas",
        url: "/despesas",
        icon: ArrowDownRight,
    },
    {
        title: "Assinaturas",
        url: "/assinaturas",
        icon: Repeat,
    },
    {
        title: "Cofrinhos",
        url: "/cofrinhos",
        icon: Wallet,
    },
    {
        title: "Relatórios",
        url: "/relatorios",
        icon: PieChart,
    },
]

const configItems = [
    {
        title: "Configurações",
        url: "/configuracoes",
        icon: Settings,
    },
]

export function DashboardSidebar() {
    const pathname = usePathname()
    const { logout } = useAuth()

    return (
        <Sidebar collapsible="icon" className="border-r border-border bg-sidebar transition-colors duration-300">
            <SidebarHeader className="flex items-center justify-start px-6 py-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-4">
                <div className="flex items-center gap-3 group-data-[collapsible=icon]:gap-0">
                    <div className="h-9 w-9 rounded-xl bg-brand-1 flex items-center justify-center shadow-lg shadow-brand-1/20 transition-transform hover:scale-105">
                        <Wallet className="h-5 w-5 text-zinc-950" />
                    </div>
                    <span className="text-2xl font-black tracking-tighter text-foreground font-display group-data-[collapsible=icon]:hidden">
                        Neux<span className="text-brand-1">Fin</span>
                    </span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60 px-6 mb-2">Menu Principal</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="px-3 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-2">
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === item.url}
                                        tooltip={item.title}
                                        className="h-10 rounded-lg hover:bg-brand-1/10 hover:text-brand-1 data-[active=true]:bg-brand-1/20 data-[active=true]:text-brand-1 transition-all duration-200 group text-sidebar-foreground"
                                    >
                                        <Link
                                            href={item.url}
                                            className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                                        >
                                            <item.icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                            <span className="font-semibold text-sm tracking-tight group-data-[collapsible=icon]:hidden">
                                                {item.title}
                                            </span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup className="mt-auto">
                    <SidebarGroupLabel className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60 px-6 mb-2">Ajustes</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="px-3 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-2">
                            {configItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === item.url}
                                        tooltip={item.title}
                                        className="h-10 rounded-lg hover:bg-brand-1/10 hover:text-brand-1 transition-all group text-sidebar-foreground"
                                    >
                                        <Link
                                            href={item.url}
                                            className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                                        >
                                            <item.icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                            <span className="font-semibold text-sm tracking-tight group-data-[collapsible=icon]:hidden">
                                                {item.title}
                                            </span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="border-t border-border p-4 group-data-[collapsible=icon]:p-2">
                <SidebarMenu className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-2">
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={logout}
                            className="w-full h-10 rounded-lg justify-start gap-3 text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 transition-all font-semibold tracking-tight cursor-pointer group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="group-data-[collapsible=icon]:hidden">Sair</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
