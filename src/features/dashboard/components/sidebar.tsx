"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import { Logo } from "@/components/ds"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { MAIN_NAV, SETTINGS_NAV, isNavActive, type NavItem } from "../nav-items"

const itemClass =
    "h-10 rounded-lg text-sidebar-foreground transition-colors hover:bg-brand-1/10 hover:text-brand-1 data-[active=true]:bg-brand-1/15 data-[active=true]:font-semibold data-[active=true]:text-brand-1"

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
    const pathname = usePathname()
    const { setOpenMobile } = useSidebar()

    return (
        <SidebarGroup>
            <SidebarGroupLabel className="eyebrow px-3">{label}</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    {items.map((item) => (
                        <SidebarMenuItem key={item.url}>
                            <SidebarMenuButton asChild isActive={isNavActive(pathname, item.url)} tooltip={item.title} className={itemClass}>
                                <Link href={item.url} onClick={() => setOpenMobile(false)}>
                                    <item.icon />
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    )
}

export function DashboardSidebar() {
    const { logout } = useAuth()

    return (
        <Sidebar collapsible="icon" className="border-r">
            <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-4">
                <Link href="/dashboard" aria-label="NeuxFin — início" className="rounded-lg">
                    <Logo className="group-data-[collapsible=icon]:[&>span:last-child]:hidden" />
                </Link>
            </SidebarHeader>
            <SidebarContent className="px-1">
                <NavGroup label="Menu principal" items={MAIN_NAV} />
                <div className="mt-auto">
                    <NavGroup label="Ajustes" items={SETTINGS_NAV} />
                </div>
            </SidebarContent>
            <SidebarFooter className="border-t p-3 pb-safe">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={logout}
                            tooltip="Sair"
                            className="h-10 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                            <LogOut />
                            <span>Sair</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
