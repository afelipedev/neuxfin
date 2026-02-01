"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { ArrowUpCircle, ArrowDownCircle, Info } from "lucide-react"
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
import { useCofrinhoActions } from "../hooks/use-cofrinhos"
import { Cofrinho } from "../services/cofrinhos"

const formSchema = z.object({
    valor: z.string().min(1, {
        message: "O valor é obrigatório.",
    }),
    data: z.string().min(1, {
        message: "A data é obrigatória.",
    }),
})

interface TransactionModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    cofrinho: Cofrinho
    tipo: 'aporte' | 'resgate'
    onSuccess?: () => void
}

export function TransactionModal({ open, onOpenChange, cofrinho, tipo, onSuccess }: TransactionModalProps) {
    const { addTransaction, loading } = useCofrinhoActions()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            valor: "",
            data: new Date().toISOString().split('T')[0],
        },
    })

    useEffect(() => {
        if (open) {
            form.reset({
                valor: "",
                data: new Date().toISOString().split('T')[0],
            })
        }
    }, [open, form])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const valorNum = parseFloat(values.valor)

        if (tipo === 'resgate' && valorNum > cofrinho.saldo_atual) {
            form.setError("valor", { message: "Saldo insuficiente para este resgate." })
            return
        }

        const data = {
            cofrinho_id: cofrinho.id,
            tipo,
            valor: valorNum,
            data: values.data,
        }

        const success = await addTransaction(data)

        if (success) {
            onOpenChange(false)
            onSuccess?.()
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {tipo === 'aporte' ? (
                            <>
                                <ArrowUpCircle className="h-5 w-5 text-emerald-500" />
                                Realizar Aporte
                            </>
                        ) : (
                            <>
                                <ArrowDownCircle className="h-5 w-5 text-rose-500" />
                                Realizar Resgate
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {cofrinho.nome} • Saldo atual: R$ {cofrinho.saldo_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
                            name="data"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Data da Movimentação</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {tipo === 'resgate' && (
                            <div className="bg-orange-500/10 p-3 rounded-lg flex gap-2 text-xs text-orange-600 font-medium">
                                <Info className="h-4 w-4 shrink-0" />
                                <p>O resgate será descontado do saldo deste cofrinho.</p>
                            </div>
                        )}

                        <DialogFooter className="pt-4">
                            <Button
                                type="submit"
                                disabled={loading}
                                className={`w-full ${tipo === 'aporte' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                            >
                                {loading ? "Processando..." : tipo === 'aporte' ? "Confirmar Aporte" : "Confirmar Resgate"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
