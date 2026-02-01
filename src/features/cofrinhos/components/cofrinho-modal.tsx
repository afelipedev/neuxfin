"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { PiggyBank, Target, Type, Palette, Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
import { useCofrinhoActions } from "../hooks/use-cofrinhos"
import { Cofrinho } from "../services/cofrinhos"

const formSchema = z.object({
    nome: z.string().min(2, {
        message: "O nome deve ter pelo menos 2 caracteres.",
    }),
    objetivo: z.string().optional(),
    descricao: z.string().optional(),
    cor: z.string(),
    icone: z.string(),
    tipo_liquidez: z.string(),
    data_prevista: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface CofrinhoModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    cofrinho?: Cofrinho
    onSuccess?: () => void
}

const COLORS = [
    { name: "Laranja", value: "#f97316" },
    { name: "Verde", value: "#10b981" },
    { name: "Azul", value: "#3b82f6" },
    { name: "Roxo", value: "#8b5cf6" },
    { name: "Rosa", value: "#ec4899" },
    { name: "Vermelho", value: "#ef4444" },
    { name: "Amarelo", value: "#eab308" },
    { name: "Cinza", value: "#6b7280" },
]

export function CofrinhoModal({ open, onOpenChange, cofrinho, onSuccess }: CofrinhoModalProps) {
    const { create, update, loading } = useCofrinhoActions()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nome: "",
            objetivo: "",
            descricao: "",
            cor: "#f97316",
            icone: "piggy-bank",
            tipo_liquidez: "diaria",
            data_prevista: "",
        },
    })

    useEffect(() => {
        if (cofrinho && open) {
            form.reset({
                nome: cofrinho.nome,
                objetivo: cofrinho.objetivo?.toString() || "",
                descricao: cofrinho.descricao || "",
                cor: cofrinho.cor,
                icone: cofrinho.icone,
                tipo_liquidez: cofrinho.tipo_liquidez,
                data_prevista: cofrinho.data_prevista ? new Date(cofrinho.data_prevista).toISOString().split('T')[0] : "",
            })
        } else if (!open) {
            form.reset({
                nome: "",
                objetivo: "",
                descricao: "",
                cor: "#f97316",
                icone: "piggy-bank",
                tipo_liquidez: "diaria",
                data_prevista: "",
            })
        }
    }, [cofrinho, open, form])

    async function onSubmit(values: FormValues) {
        const data = {
            nome: values.nome,
            cor: values.cor,
            icone: values.icone,
            tipo_liquidez: values.tipo_liquidez,
            objetivo: values.objetivo ? parseFloat(values.objetivo) : null,
            descricao: values.descricao || null,
            data_prevista: values.data_prevista || null,
        }

        let success = false
        if (cofrinho) {
            success = await update(cofrinho.id, data)
        } else {
            success = await create(data)
        }

        if (success) {
            onOpenChange(false)
            onSuccess?.()
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{cofrinho ? "Editar Cofrinho" : "Novo Cofrinho"}</DialogTitle>
                    <DialogDescription>
                        Defina seus objetivos de economia e investimentos.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="nome"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome do Cofrinho</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <PiggyBank className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input placeholder="Ex: Reserva de Emergência" className="pl-9" {...field} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="objetivo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Meta (R$)</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Target className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                <Input type="number" step="0.01" placeholder="0,00" className="pl-9" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="tipo_liquidez"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Liquidez</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="diaria">Diária</SelectItem>
                                                <SelectItem value="fixa">Prazo Fixo</SelectItem>
                                                <SelectItem value="indeterminada">Indeterminada</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="cor"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cor do Card</FormLabel>
                                    <div className="flex flex-wrap gap-2">
                                        {COLORS.map((color) => (
                                            <button
                                                key={color.value}
                                                type="button"
                                                className={`h-8 w-8 rounded-full border-2 transition-all ${field.value === color.value ? "border-black dark:border-white scale-110" : "border-transparent opacity-60 hover:opacity-100"}`}
                                                style={{ backgroundColor: color.value }}
                                                onClick={() => field.onChange(color.value)}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="data_prevista"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Data Prevista (Opcional)</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input type="date" className="pl-9" {...field} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-4">
                            <Button type="submit" disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700">
                                {loading ? "Salvando..." : cofrinho ? "Atualizar" : "Criar Cofrinho"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
