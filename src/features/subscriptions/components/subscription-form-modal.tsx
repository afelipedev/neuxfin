"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Plus, CreditCard, Edit } from "lucide-react"

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
import { cn } from "@/lib/utils"
import { useSubscriptionActions } from "../hooks/use-subscriptions"
import { createClient } from "@/lib/supabase/client"
import { Subscription } from "../services/subscriptions"

const formSchema = z.object({
    nome: z.string().min(2, {
        message: "Nome deve ter pelo menos 2 caracteres.",
    }),
    valor: z.string().min(1, "Valor é obrigatório"),
    descricao: z.string().optional(),
    categoria_id: z.string().optional(),
    cartao_id: z.string().optional(),
    frequencia: z.enum(["mensal", "anual", "semanal", "trimestral"]),
    data_vencimento_dia: z.number().min(1).max(31),
    status: z.enum(["ativo", "pausado", "cancelado"]),
    url: z.string().optional(),
    icone: z.string().optional(),
    cor: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface Category {
    id: string
    nome: string
    tipo: string
}

interface CreditCardType {
    id: string
    nome: string
    bandeira: string | null
    cor: string | null
}

interface SubscriptionFormModalProps {
    subscription?: Subscription | null
    onSuccess?: () => void
    trigger?: React.ReactNode
}

export function SubscriptionFormModal({ subscription, onSuccess, trigger }: SubscriptionFormModalProps) {
    const [open, setOpen] = React.useState(false)
    const [categories, setCategories] = React.useState<Category[]>([])
    const [creditCards, setCreditCards] = React.useState<CreditCardType[]>([])
    const { create, update, loading } = useSubscriptionActions()

    const isEditing = !!subscription

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nome: "",
            valor: "",
            descricao: "",
            categoria_id: "",
            cartao_id: "",
            frequencia: "mensal",
            data_vencimento_dia: 1,
            status: "ativo",
            url: "",
            icone: "",
            cor: "",
        },
    })

    // Quando abrir o modal e houver uma assinatura para editar
    React.useEffect(() => {
        if (open && subscription) {
            form.reset({
                nome: subscription.nome,
                valor: String(subscription.valor),
                descricao: subscription.descricao || "",
                categoria_id: subscription.categoria_id || "",
                cartao_id: subscription.cartao_id || "",
                frequencia: subscription.frequencia || "mensal",
                data_vencimento_dia: subscription.data_vencimento_dia || 1,
                status: subscription.status || "ativo",
                url: subscription.url || "",
                icone: subscription.icone || "",
                cor: subscription.cor || "",
            })
        } else if (open && !subscription) {
            form.reset({
                nome: "",
                valor: "",
                descricao: "",
                categoria_id: "",
                cartao_id: "",
                frequencia: "mensal",
                data_vencimento_dia: 1,
                status: "ativo",
                url: "",
                icone: "",
                cor: "",
            })
        }
    }, [open, subscription, form])

    React.useEffect(() => {
        const loadData = async () => {
            const supabase = createClient()

            // Carregar categorias de despesa
            const { data: categoriesData } = await supabase
                .from('categorias')
                .select('id, nome, tipo')
                .eq('tipo', 'despesa')
                .order('nome')

            if (categoriesData) setCategories(categoriesData)

            // Carregar cartões de crédito
            const { data: cardsData } = await supabase
                .from('cartoes_credito')
                .select('id, nome, bandeira, cor')
                .order('nome')

            if (cardsData) setCreditCards(cardsData)
        }
        if (open) loadData()
    }, [open])

    async function onSubmit(values: FormValues) {
        try {
            const subscriptionData = {
                nome: values.nome,
                valor: Number(values.valor),
                descricao: values.descricao || null,
                categoria_id: values.categoria_id || null,
                cartao_id: values.cartao_id || null,
                frequencia: values.frequencia,
                data_vencimento_dia: values.data_vencimento_dia,
                status: values.status,
                url: values.url || null,
                icone: values.icone || null,
                cor: values.cor || null,
            }

            let success: boolean

            if (isEditing && subscription) {
                success = await update(subscription.id, subscriptionData)
            } else {
                success = await create(subscriptionData as any)
            }

            if (success) {
                setOpen(false)
                form.reset()
                onSuccess?.()
            }
        } catch (error) {
            console.error(error)
        }
    }

    const frequenciaOptions = [
        { value: "mensal", label: "Mensal" },
        { value: "anual", label: "Anual" },
        { value: "trimestral", label: "Trimestral" },
        { value: "semanal", label: "Semanal" },
    ]

    const statusOptions = [
        { value: "ativo", label: "Ativo" },
        { value: "pausado", label: "Pausado" },
        { value: "cancelado", label: "Cancelado" },
    ]

    const defaultTrigger = isEditing ? (
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-indigo-500">
            <Edit className="h-4 w-4" />
        </Button>
    ) : (
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 px-6">
            <Plus className="mr-2 h-4 w-4" />
            Nova Assinatura
        </Button>
    )

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || defaultTrigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Editar' : 'Nova'} Assinatura</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Edite os dados da assinatura abaixo.'
                            : 'Preencha os dados abaixo para adicionar uma nova assinatura.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="nome"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome do Serviço</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Netflix, Spotify..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="descricao"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição (opcional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Plano Premium 4K" {...field} />
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
                                name="frequencia"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Frequência</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {frequenciaOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="data_vencimento_dia"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Dia do Vencimento</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min="1"
                                                max="31"
                                                placeholder="Ex: 10"
                                                value={field.value}
                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                            />
                                        </FormControl>
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
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {statusOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
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
                            name="categoria_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Categoria (opcional)</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ""}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione uma categoria" />
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

                        <FormField
                            control={form.control}
                            name="cartao_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                        <CreditCard className="h-4 w-4" />
                                        Cartão de Crédito (opcional)
                                    </FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ""}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Vincular a um cartão" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {creditCards.map((card) => (
                                                <SelectItem key={card.id} value={card.id}>
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: card.cor || '#6366f1' }}
                                                        />
                                                        {card.nome} {card.bandeira && `(${card.bandeira})`}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Vincule um cartão para melhor controle dos gastos
                                    </p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="url"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Link do Serviço (opcional)</FormLabel>
                                    <FormControl>
                                        <Input type="url" placeholder="https://www.netflix.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading} className="w-full sm:w-auto">
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto"
                            >
                                {loading ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Criar Assinatura')}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
