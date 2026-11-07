import {
    ArrowDownRight,
    ArrowUpRight,
    CreditCard,
    LayoutDashboard,
    PieChart,
    PiggyBank,
    Repeat,
    Settings,
    type LucideIcon,
} from "lucide-react"

export interface NavItem {
    title: string
    url: string
    icon: LucideIcon
}

/** Navegação principal (sidebar e barra inferior mobile usam a mesma lista). */
export const MAIN_NAV: NavItem[] = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Receitas", url: "/receitas", icon: ArrowUpRight },
    { title: "Despesas", url: "/despesas", icon: ArrowDownRight },
    { title: "Cartões", url: "/cartoes", icon: CreditCard },
    { title: "Assinaturas", url: "/assinaturas", icon: Repeat },
    { title: "Cofrinhos", url: "/cofrinhos", icon: PiggyBank },
    { title: "Relatórios", url: "/relatorios", icon: PieChart },
]

export const SETTINGS_NAV: NavItem[] = [
    { title: "Configurações", url: "/configuracoes", icon: Settings },
]

/** Ativo também nas páginas de detalhe (/cartoes/123 marca "Cartões"). */
export function isNavActive(pathname: string, url: string): boolean {
    return pathname === url || pathname.startsWith(`${url}/`)
}
