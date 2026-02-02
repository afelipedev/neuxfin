"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { CalendarIcon, Plus } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn, formatDateToISO } from "@/lib/utils"
import { useTransactionActions } from "../hooks/use-transactions"
import { createClient } from "@/lib/supabase/client"

const formSchema = z.object({
    descricao: z.string().min(2, {
        message: "Descrição deve ter pelo menos 2 caracteres.",
    }),
    valor: z.string().min(1, "Valor é obrigatório"),
    tipo_perfil: z.enum(["PF", "PJ"]),
    categoria_id: z.string().min(1, "Categoria é obrigatória"),
    conta_id: z.string().min(1, "Conta bancária é obrigatória"),
    recorrencia: z.string().optional(),
    data: z.date(),
    status: z.string(),
    tipo_despesa: z.enum(["fixa", "variavel"]).optional(),
    is_parcelado: z.boolean(),
    total_parcelas: z.number().min(2).max(60).optional(),
})

type FormValues = z.infer<typeof formSchema>

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
}

export function TransactionForm({ type, onSuccess, trigger }: { type: "receita" | "despesa", onSuccess?: () => void, trigger?: React.ReactNode }) {
    const [open, setOpen] = React.useState(false)
    const [categories, setCategories] = React.useState<Category[]>([])
    const [bankAccounts, setBankAccounts] = React.useState<BankAccount[]>([])
    const { create, loading } = useTransactionActions()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            descricao: "",
            valor: "",
            tipo_perfil: "PF",
            status: type === "receita" ? "liquidado" : "pendente",
            data: new Date(),
            is_parcelado: false,
            total_parcelas: 2,
            conta_id: "",
        },
    })

    const isParcelado = form.watch("is_parcelado")

    React.useEffect(() => {
        const loadData = async () => {
            const supabase = createClient()

            // Carregar categorias
            const { data: categoriesData } = await supabase
                .from('categorias')
                .select('id, nome, tipo')
                .or(`tipo.eq.${type},tipo.is.null`)

            if (categoriesData) setCategories(categoriesData)

            // Carregar contas bancárias
            const { data: accountsData } = await supabase
                .from('contas_bancarias')
                .select('id, nome, instituicao, tipo')
                .order('nome')

            if (accountsData) setBankAccounts(accountsData)
        }
        if (open) loadData()
    }, [open, type])

    async function onSubmit(values: FormValues) {
        try {
            const success = await create({
                descricao: values.descricao,
                valor: Number(values.valor),
                tipo: values.tipo_perfil,
                tipo_transacao: type,
                categoria_id: values.categoria_id,
                conta_id: values.conta_id,
                data_vencimento: formatDateToISO(values.data),
                data_pagamento: values.status === 'liquidado' ? formatDateToISO(values.data) : null,
                status: values.status as any,
                is_recorrente: !!values.recorrencia,
                parcela_atual: null,
                total_parcelas: null,
            }, values.is_parcelado && values.total_parcelas ? values.total_parcelas : undefined)

            if (success) {
                setOpen(false)
                form.reset()
                onSuccess?.()
            }
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className={cn(
                        "text-white",
                        type === "receita" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                    )}>
                        <Plus className="mr-2 h-4 w-4" /> Nova {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Cadastrar {type}</DialogTitle>
                    <DialogDescription>
                        Preencha os dados abaixo para adicionar uma nova {type}.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                        <FormField
                            control={form.control}
                            name="conta_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Conta Bancária</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="data"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Data</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP", { locale: ptBR })
                                                    ) : (
                                                        <span>Selecione uma data</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                    date < new Date("1900-01-01")
                                                }
                                                initialFocus
                                                locale={ptBR}
                                            />
                                        </PopoverContent>
                                    </Popover>
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
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading} className="w-full sm:w-auto">
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className={cn(
                                    "text-white",
                                    type === "receita" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700",
                                    "w-full sm:w-auto"
                                )}
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
