"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { CreditCard, Landmark, Plus } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import type { FieldErrors } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { DatePicker } from "@/components/ds"
import { Checkbox } from "@/components/ui/checkbox"
import { formatDateToISO, parseLocalDate } from "@/lib/utils"
import { useTransactionActions } from "../hooks/use-transactions"
import { createClient } from "@/lib/supabase/client"
import { type CardInfo, invoiceDates, invoiceKeyForDate } from "@/features/credit-cards/services/invoices"

const formSchema = z.object({
    descricao: z.string().min(2, {
        message: "Descrição deve ter pelo menos 2 caracteres.",
    }),
    valor: z.string().min(1, "Valor é obrigatório"),
    tipo_perfil: z.enum(["PF", "PJ"]),
    categoria_id: z.string().min(1, "Categoria é obrigatória"),
    forma_pagamento: z.enum(["conta", "cartao"]),
    // Opcionais: o campo da forma de pagamento não escolhida sai da tela e pode ficar undefined
    conta_id: z.string().optional(),
    cartao_id: z.string().optional(),
    // Repetir todo mês por N meses (série recorrente); não combina com parcelamento
    is_recorrente: z.boolean(),
    meses_recorrencia: z.number().int().min(2).max(60).optional(),
    data: z.date({ error: "Selecione a data" }),
    status: z.enum(["liquidado", "pendente"]),
    tipo_despesa: z.enum(["fixa", "variavel"]).optional(),
    is_parcelado: z.boolean(),
    total_parcelas: z.number().min(2).max(60).optional(),
}).superRefine((values, ctx) => {
    if (values.forma_pagamento === "conta" && !values.conta_id) {
        ctx.addIssue({ code: "custom", path: ["conta_id"], message: "Conta bancária é obrigatória" })
    }
    if (values.forma_pagamento === "cartao" && !values.cartao_id) {
        ctx.addIssue({ code: "custom", path: ["cartao_id"], message: "Selecione o cartão" })
    }
})

type FormValues = z.infer<typeof formSchema>

const FIELD_LABELS: Record<string, string> = {
    descricao: "Descrição",
    valor: "Valor",
    tipo_perfil: "Perfil",
    categoria_id: "Categoria",
    forma_pagamento: "Forma de pagamento",
    conta_id: "Conta bancária",
    cartao_id: "Cartão",
    data: "Data",
    status: "Status",
    total_parcelas: "Parcelas",
    meses_recorrencia: "Meses de recorrência",
}

interface Category {
    id: string
    nome: string
    tipo: string
}

interface BankAccount {
    id: string
    nome: string
    instituicao: string | null
    tipo: string
    padrao: boolean
}

interface TransactionFormProps {
    type: "receita" | "despesa"
    onSuccess?: () => void
    trigger?: React.ReactNode
    /** Abertura controlada (ex.: menu "Nova transação"). Sem `trigger`, nenhum botão é renderizado. */
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

const emptyValues = (type: "receita" | "despesa"): FormValues => ({
    descricao: "",
    valor: "",
    tipo_perfil: "PF",
    categoria_id: "",
    forma_pagamento: "conta",
    conta_id: "",
    cartao_id: "",
    status: type === "receita" ? "liquidado" : "pendente",
    data: new Date(),
    is_parcelado: false,
    total_parcelas: 2,
    is_recorrente: false,
    meses_recorrencia: 12,
})

export function TransactionForm({ type, onSuccess, trigger, open: openProp, onOpenChange }: TransactionFormProps) {
    const [internalOpen, setInternalOpen] = React.useState(false)
    const isControlled = openProp !== undefined
    const open = isControlled ? openProp : internalOpen
    const setOpen = React.useCallback((next: boolean) => {
        if (!isControlled) setInternalOpen(next)
        onOpenChange?.(next)
    }, [isControlled, onOpenChange])

    const [categories, setCategories] = React.useState<Category[]>([])
    const [bankAccounts, setBankAccounts] = React.useState<BankAccount[]>([])
    const [cards, setCards] = React.useState<CardInfo[]>([])
    const { create, loading } = useTransactionActions()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: emptyValues(type),
    })

    const isParcelado = form.watch("is_parcelado")
    const isRecorrente = form.watch("is_recorrente")
    const formaPagamento = form.watch("forma_pagamento")
    const cartaoId = form.watch("cartao_id")
    const dataCompra = form.watch("data")
    const isCartao = type === "despesa" && formaPagamento === "cartao"

    const selectedCard = cards.find(c => c.id === cartaoId)
    const faturaInfo = isCartao && selectedCard && dataCompra
        ? (() => {
            const key = invoiceKeyForDate(formatDateToISO(dataCompra), selectedCard)
            const { vencimento } = invoiceDates(key, selectedCard)
            return { key, vencimento }
        })()
        : null

    React.useEffect(() => {
        const loadData = async () => {
            const supabase = createClient()

            const [{ data: categoriesData }, { data: accountsData }, { data: cardsData }] = await Promise.all([
                supabase.from('categorias').select('id, nome, tipo').or(`tipo.eq.${type},tipo.is.null`),
                supabase.from('contas_bancarias').select('id, nome, instituicao, tipo, padrao').order('nome'),
                type === 'despesa'
                    ? supabase.from('cartoes_credito').select('id, nome, limite, dia_fechamento, dia_vencimento').order('nome')
                    : Promise.resolve({ data: [] as CardInfo[] }),
            ])

            if (categoriesData) setCategories(categoriesData)
            if (accountsData) {
                setBankAccounts(accountsData)
                // Pré-seleciona a conta padrão (ou a única conta)
                const padrao = accountsData.find(a => a.padrao) ?? (accountsData.length === 1 ? accountsData[0] : undefined)
                if (padrao && !form.getValues("conta_id")) form.setValue("conta_id", padrao.id)
            }
            if (cardsData) setCards(cardsData as CardInfo[])
        }
        if (open) loadData()
    }, [open, type, form])

    async function onSubmit(values: FormValues) {
        const viaCartao = type === "despesa" && values.forma_pagamento === "cartao"
        // Compra no cartão fica em aberto até o pagamento da fatura
        const status = viaCartao ? "pendente" : values.status
        try {
            const success = await create({
                descricao: values.descricao,
                valor: Number(values.valor),
                tipo: values.tipo_perfil,
                tipo_transacao: type,
                categoria_id: values.categoria_id,
                conta_id: viaCartao ? null : values.conta_id,
                cartao_id: viaCartao ? values.cartao_id : null,
                data_vencimento: formatDateToISO(values.data),
                data_pagamento: status === 'liquidado' ? formatDateToISO(values.data) : null,
                status,
                is_recorrente: values.is_recorrente,
                parcela_atual: null,
                total_parcelas: null,
            },
                values.is_parcelado && values.total_parcelas ? values.total_parcelas : undefined,
                values.is_recorrente && !values.is_parcelado ? values.meses_recorrencia : undefined)

            if (success) {
                setOpen(false)
                form.reset(emptyValues(type))
                onSuccess?.()
            }
        } catch (error) {
            console.error(error)
        }
    }

    // Avisa quando a validação bloqueia o envio (inclui campos que não estão visíveis)
    function onInvalid(errors: FieldErrors<FormValues>) {
        const [field, first] = Object.entries(errors)[0] ?? []
        console.warn("[transaction-form] validação", errors)
        const message = typeof first?.message === "string" ? first.message : "Revise os campos do formulário"
        toast.error(field ? `${FIELD_LABELS[field] ?? field}: ${message}` : message)
    }

    const showTrigger = !isControlled || trigger

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {showTrigger && (
                <DialogTrigger asChild>
                    {trigger || (
                        <Button>
                            <Plus /> Nova {type}
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>Cadastrar {type}</DialogTitle>
                    <DialogDescription>
                        Preencha os dados abaixo para adicionar uma nova {type}.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="descricao"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Aluguel, Salário..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="valor"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Valor (R$)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" placeholder="0,00" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="categoria_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Categoria</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {categories.map((category) => (
                                                    <SelectItem key={category.id} value={category.id}>
                                                        {category.nome}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {type === "despesa" && cards.length > 0 && (
                            <FormField
                                control={form.control}
                                name="forma_pagamento"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Forma de pagamento</FormLabel>
                                        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Forma de pagamento">
                                            {([
                                                { value: "conta", label: "Conta / Pix / Débito", icon: Landmark },
                                                { value: "cartao", label: "Cartão de crédito", icon: CreditCard },
                                            ] as const).map(opt => (
                                                <Button
                                                    key={opt.value}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={field.value === opt.value}
                                                    variant={field.value === opt.value ? "default" : "outline"}
                                                    className="justify-start gap-2"
                                                    onClick={() => field.onChange(opt.value)}
                                                >
                                                    <opt.icon className="h-4 w-4" />
                                                    {opt.label}
                                                </Button>
                                            ))}
                                        </div>
                                    </FormItem>
                                )}
                            />
                        )}

                        {isCartao ? (
                            <FormField
                                control={form.control}
                                name="cartao_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cartão</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o cartão" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {cards.map((card) => (
                                                    <SelectItem key={card.id} value={card.id}>{card.nome}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {faturaInfo && (
                                            <p className="text-xs text-muted-foreground">
                                                Entra na fatura de {format(parseLocalDate(`${faturaInfo.key}-01`), "MMMM 'de' yyyy", { locale: ptBR })}, com vencimento em {format(parseLocalDate(faturaInfo.vencimento), "dd/MM/yyyy")}.
                                            </p>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : (
                            <FormField
                                control={form.control}
                                name="conta_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Conta Bancária</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione a conta" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {bankAccounts.map((account) => (
                                                    <SelectItem key={account.id} value={account.id}>
                                                        {account.nome} {account.instituicao && `- ${account.instituicao}`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="tipo_perfil"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Perfil</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="PF">PF</SelectItem>
                                                <SelectItem value="PJ">PJ</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {!isCartao && <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="liquidado">Pago/Recebido</SelectItem>
                                                <SelectItem value="pendente">Pendente</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />}
                        </div>

                        <FormField
                            control={form.control}
                            name="data"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>{isCartao ? "Data da compra" : "Data"}</FormLabel>
                                    <FormControl>
                                        <DatePicker
                                            value={field.value ? formatDateToISO(field.value) : ""}
                                            onChange={(iso) => field.onChange(parseLocalDate(iso))}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Parcelamento */}
                        <div className="space-y-3 border-t pt-4">
                            <FormField
                                control={form.control}
                                name="is_parcelado"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                disabled={isRecorrente}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel className="cursor-pointer">
                                                Parcelar esta transação
                                            </FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            {isParcelado && (
                                <FormField
                                    control={form.control}
                                    name="total_parcelas"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Número de Parcelas</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min="2"
                                                    max="60"
                                                    placeholder="Ex: 12"
                                                    value={field.value || ''}
                                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 2)}
                                                />
                                            </FormControl>
                                            <p className="text-xs text-muted-foreground">
                                                Serão criadas {field.value || 2} transações mensais automaticamente
                                            </p>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <FormField
                                control={form.control}
                                name="is_recorrente"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                disabled={isParcelado}
                                                onCheckedChange={(v) => field.onChange(v === true)}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel className="cursor-pointer">Repetir todo mês</FormLabel>
                                            <p className="text-xs text-muted-foreground">
                                                Mesmo valor todo mês (ex.: salário, aluguel). Diferente de parcelar, o valor não é dividido.
                                            </p>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            {isRecorrente && (
                                <FormField
                                    control={form.control}
                                    name="meses_recorrencia"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Por quantos meses</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min="2"
                                                    max="60"
                                                    value={field.value || ''}
                                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 2)}
                                                />
                                            </FormControl>
                                            <p className="text-xs text-muted-foreground">
                                                Serão criados {field.value || 2} lançamentos, um por mês, a partir da data escolhida. Os futuros ficam pendentes.
                                            </p>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading} className="w-full sm:w-auto">
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full sm:w-auto"
                            >
                                {loading ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
