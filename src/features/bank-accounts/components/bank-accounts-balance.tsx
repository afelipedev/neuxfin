"use client"

import Link from "next/link"
import { Building2, ChevronRight, Coins, Landmark, PiggyBank, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Amount, IconTile, SectionCard } from "@/components/ds"
import { useBankAccounts } from "@/features/bank-accounts/hooks/use-bank-accounts"
import { formatCurrency } from "@/lib/utils"

export const accountIconMap = {
    corrente: Building2,
    poupanca: PiggyBank,
    investimento: Landmark,
    dinheiro: Coins,
    outros: Wallet,
}

export function BankAccountsBalance() {
    const { accounts, totalBalance, loading, error } = useBankAccounts()

    return (
        <SectionCard
            title="Saldo das contas"
            actions={!loading && !error && (
                <span className="font-display text-base font-bold tabular-nums text-brand-1">{formatCurrency(totalBalance)}</span>
            )}
        >
            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
                </div>
            ) : error ? (
                <p className="text-sm text-destructive">Erro ao carregar contas: {error}</p>
            ) : accounts.length === 0 ? (
                <div className="space-y-3 py-6 text-center">
                    <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada</p>
                    <Button asChild variant="outline" size="sm">
                        <Link href="/configuracoes?tab=contas">Cadastrar conta</Link>
                    </Button>
                </div>
            ) : (
                <ul className="stagger -mx-2 space-y-0.5">
                    {accounts.map((account) => (
                        <li key={account.id}>
                            <Link
                                href={`/contas/${account.id}`}
                                aria-label={`Ver extrato de ${account.nome}`}
                                className="group flex min-h-14 items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted"
                            >
                                <IconTile icon={accountIconMap[account.tipo] || Wallet} color={account.cor} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{account.nome}</p>
                                    <p className="truncate text-xs capitalize text-muted-foreground">{account.instituicao || account.tipo}</p>
                                </div>
                                <Amount value={account.saldo_atual} kind="auto" className="text-sm" />
                                <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-brand-1" aria-hidden="true" />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </SectionCard>
    )
}
