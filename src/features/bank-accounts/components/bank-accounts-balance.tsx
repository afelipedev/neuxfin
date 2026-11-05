"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useBankAccounts } from "@/features/bank-accounts/hooks/use-bank-accounts"
import { Wallet, Building2, PiggyBank, Landmark, Coins, ChevronRight } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export const accountIconMap = {
    corrente: Building2,
    poupanca: PiggyBank,
    investimento: Landmark,
    dinheiro: Coins,
    outros: Wallet
}

export function BankAccountsBalance() {
    const { accounts, totalBalance, loading, error } = useBankAccounts()

    if (loading) {
        return (
            <Card className="border-none glass-card shadow-none overflow-hidden rounded-3xl">
                <CardHeader className="p-6 pb-4">
                    <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        Saldo das Contas
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 space-y-3">
                    <Skeleton className="h-20 w-full rounded-2xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card className="border-none glass-card shadow-none overflow-hidden rounded-3xl">
                <CardContent className="p-6">
                    <p className="text-sm text-rose-500">Erro ao carregar contas: {error}</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-none glass-card shadow-none overflow-hidden rounded-3xl group transition-all duration-300">
            <CardHeader className="p-6 pb-4">
                <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Saldo das Contas
                </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4">
                {/* Total Geral */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-1 via-brand-2 to-brand-3 p-6 shadow-xl shadow-brand-1/20">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-950/70 mb-2">
                            Saldo Total
                        </p>
                        <p className="text-3xl font-black tracking-tighter text-zinc-950 font-display tabular-nums">
                            {formatCurrency(totalBalance)}
                        </p>
                    </div>
                    <div className="absolute -right-4 -bottom-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                    <div className="absolute -left-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
                </div>

                {/* Lista de Contas */}
                <div className="space-y-2">
                    {accounts.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/50 italic">
                                Nenhuma conta cadastrada
                            </p>
                            <Link href="/configuracoes" className="text-xs text-brand-1 hover:underline mt-2 inline-block">
                                Cadastre suas contas em Configurações
                            </Link>
                        </div>
                    ) : (
                        accounts.map((account) => {
                            const Icon = accountIconMap[account.tipo] || Wallet
                            const isPositive = account.saldo_atual >= 0

                            return (
                                <Link
                                    key={account.id}
                                    href={`/contas/${account.id}`}
                                    aria-label={`Ver extrato de ${account.nome}`}
                                    className="group/item block relative overflow-hidden rounded-xl border border-border bg-background/50 p-4 transition-all hover:bg-brand-1/5 hover:border-brand-1/30 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-1"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div
                                                className={cn(
                                                    "h-10 w-10 rounded-xl flex items-center justify-center transition-all group-hover/item:scale-110 shrink-0",
                                                    !account.cor && "bg-brand-1/10"
                                                )}
                                                style={account.cor ? {
                                                    backgroundColor: `${account.cor}15`,
                                                    color: account.cor
                                                } : undefined}
                                            >
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm tracking-tight text-foreground truncate">
                                                    {account.nome}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground/60 uppercase font-black tracking-widest">
                                                    {account.instituicao || account.tipo}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className={cn(
                                                "font-black text-sm tracking-tighter tabular-nums",
                                                isPositive ? "text-brand-2" : "text-rose-500"
                                            )}>
                                                {formatCurrency(account.saldo_atual)}
                                            </p>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover/item:text-brand-1 transition-colors" />
                                        </div>
                                    </div>
                                </Link>
                            )
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
