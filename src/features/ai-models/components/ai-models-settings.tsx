"use client"

import * as React from "react"
import { Bot, Edit, KeyRound, Loader2, MessageSquare, Plus, Trash2, Zap, BarChart3, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ToneBadge } from "@/components/ds"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    listAIModels, removeAIModel, saveAIModel, testAIModel, type AIModelConfig,
} from "../services/ai-models"
import { AI_PROVIDERS, DEFAULT_MODEL, DEFAULT_PROVIDER, providerLabel, type AIProvider } from "../services/providers"

interface FormState {
    nome: string
    provedor: AIProvider
    modelo: string
    api_key: string
    usar_chat: boolean
    usar_analise: boolean
}

const emptyForm = (isFirst: boolean): FormState => ({
    nome: "Groq GPT-OSS 20B",
    provedor: DEFAULT_PROVIDER,
    modelo: DEFAULT_MODEL,
    api_key: "",
    // O primeiro modelo já atende os dois usos
    usar_chat: isFirst,
    usar_analise: isFirst,
})

export function AIModelsSettings() {
    const [models, setModels] = React.useState<AIModelConfig[]>([])
    const [loading, setLoading] = React.useState(true)
    const [dialogOpen, setDialogOpen] = React.useState(false)
    const [editing, setEditing] = React.useState<AIModelConfig | null>(null)
    const [form, setForm] = React.useState<FormState>(emptyForm(true))
    const [saving, setSaving] = React.useState(false)
    const [testingId, setTestingId] = React.useState<string | null>(null)
    const [deleting, setDeleting] = React.useState<AIModelConfig | null>(null)

    const provider = AI_PROVIDERS.find(p => p.id === form.provedor) ?? AI_PROVIDERS[0]

    const load = React.useCallback(async () => {
        try {
            setModels(await listAIModels())
        } catch (error) {
            console.error(error)
            toast.error("Não foi possível carregar os modelos de IA")
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => { load() }, [load])

    const openCreate = () => {
        setEditing(null)
        setForm(emptyForm(models.length === 0))
        setDialogOpen(true)
    }

    const openEdit = (model: AIModelConfig) => {
        setEditing(model)
        setForm({
            nome: model.nome,
            provedor: model.provedor,
            modelo: model.modelo,
            api_key: "",
            usar_chat: model.usar_chat,
            usar_analise: model.usar_analise,
        })
        setDialogOpen(true)
    }

    const runTest = async (id: string) => {
        setTestingId(id)
        try {
            const result = await testAIModel(id)
            if (result.ok) toast.success(result.message)
            else toast.error("Falha no teste", { description: result.message })
        } finally {
            setTestingId(null)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editing && form.api_key.trim().length < 10) {
            toast.error("Informe uma API key válida")
            return
        }
        setSaving(true)
        try {
            const id = await saveAIModel({
                id: editing?.id,
                nome: form.nome.trim(),
                provedor: form.provedor,
                modelo: form.modelo.trim(),
                api_key: form.api_key.trim() || undefined,
                usar_chat: form.usar_chat,
                usar_analise: form.usar_analise,
            })
            toast.success(editing ? "Modelo atualizado" : "Modelo cadastrado")
            setDialogOpen(false)
            await load()
            // Valida chave e modelo logo após salvar
            runTest(id)
        } catch (error) {
            const err = error as { message?: string }
            toast.error("Erro ao salvar modelo", { description: err?.message })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deleting) return
        try {
            await removeAIModel(deleting.id)
            toast.success("Modelo removido", { description: "A API key foi apagada do cofre." })
            setDeleting(null)
            load()
        } catch {
            toast.error("Não foi possível remover o modelo")
        }
    }

    const missingChat = !loading && !models.some(m => m.usar_chat)
    const missingAnalise = !loading && !models.some(m => m.usar_analise)

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold">Modelos de IA</h2>
                    <p className="text-sm text-muted-foreground">
                        Escolha o provedor e o modelo usados pelo Amigão e pela análise de relatórios
                    </p>
                </div>
                <Button onClick={openCreate} className="w-full sm:w-auto justify-center">
                    <Plus className="mr-2 h-4 w-4" /> Novo Modelo
                </Button>
            </div>

            {(missingChat || missingAnalise) && (
                <div role="status" className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
                    {models.length === 0
                        ? "Nenhum modelo cadastrado: o chat e a análise com IA ficam indisponíveis até você adicionar um."
                        : `Nenhum modelo marcado para ${[missingChat && "o chat", missingAnalise && "a análise"].filter(Boolean).join(" e ")}. Edite um modelo e marque o uso.`}
                </div>
            )}

            <Card className="gap-0 overflow-hidden py-0">
                <CardContent className="p-0 overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="px-6">Modelo</TableHead>
                                <TableHead >Provedor</TableHead>
                                <TableHead >API key</TableHead>
                                <TableHead >Uso</TableHead>
                                <TableHead className="text-right px-6">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Carregando modelos...</TableCell>
                                </TableRow>
                            ) : models.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Nenhum modelo cadastrado.</TableCell>
                                </TableRow>
                            ) : models.map(model => (
                                <TableRow key={model.id} className="hover:bg-muted transition-colors">
                                    <TableCell className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-1/15 text-brand-1">
                                                <Bot className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{model.nome}</p>
                                                <p className="font-mono text-xs text-muted-foreground">{model.modelo}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{providerLabel(model.provedor)}</Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        <span className="inline-flex items-center gap-1"><KeyRound className="h-3 w-3" />••••{model.chave_final}</span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {model.usar_chat && <ToneBadge tone="brand"><MessageSquare />Chat</ToneBadge>}
                                            {model.usar_analise && <ToneBadge tone="secondary"><BarChart3 />Análise</ToneBadge>}
                                            {!model.usar_chat && !model.usar_analise && <span className="text-xs text-muted-foreground">Sem uso</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right px-6">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost" size="sm" className="h-7 text-xs"
                                                disabled={testingId === model.id}
                                                onClick={() => runTest(model.id)}
                                            >
                                                {testingId === model.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-1 h-3.5 w-3.5" />}
                                                Testar
                                            </Button>
                                            <Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={`Editar ${model.nome}`} onClick={() => openEdit(model)}>
                                                <Edit className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon-sm" className="text-destructive" aria-label={`Remover ${model.nome}`} onClick={() => setDeleting(model)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
                As API keys ficam criptografadas no cofre do banco (Supabase Vault) e são usadas apenas pelo servidor.
                Depois de salva, a chave não pode ser exibida novamente, só substituída.
            </p>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Editar modelo de IA" : "Novo modelo de IA"}</DialogTitle>
                        <DialogDescription>Informe o provedor, o modelo e a API key.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="ia-provedor">Provedor</Label>
                                <Select
                                    value={form.provedor}
                                    onValueChange={(value) => {
                                        const next = AI_PROVIDERS.find(p => p.id === value) ?? AI_PROVIDERS[0]
                                        setForm(f => ({ ...f, provedor: next.id, modelo: next.models[0].id }))
                                    }}
                                >
                                    <SelectTrigger id="ia-provedor"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {AI_PROVIDERS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ia-nome">Nome</Label>
                                <Input
                                    id="ia-nome"
                                    value={form.nome}
                                    maxLength={60}
                                    onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="ia-modelo">Modelo</Label>
                            <Input
                                id="ia-modelo"
                                className="font-mono"
                                value={form.modelo}
                                maxLength={120}
                                onChange={(e) => setForm(f => ({ ...f, modelo: e.target.value }))}
                                required
                            />
                            <div className="flex flex-wrap gap-1.5">
                                {provider.models.map(m => (
                                    <Button
                                        key={m.id}
                                        type="button"
                                        size="sm"
                                        variant={form.modelo === m.id ? "default" : "outline"}
                                        className="h-7 text-xs"
                                        onClick={() => setForm(f => ({ ...f, modelo: m.id }))}
                                    >
                                        {m.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="ia-key">API key</Label>
                            <Input
                                id="ia-key"
                                type="password"
                                autoComplete="off"
                                className="font-mono"
                                placeholder={editing ? `••••${editing.chave_final} (deixe vazio para manter)` : `${provider.keyPrefix}...`}
                                value={form.api_key}
                                onChange={(e) => setForm(f => ({ ...f, api_key: e.target.value }))}
                                required={!editing}
                            />
                            <a href={provider.keysUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground underline">
                                Gerar uma chave na {provider.label} <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>

                        <fieldset className="space-y-2">
                            <legend className="text-sm font-medium">Usar este modelo em</legend>
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox checked={form.usar_chat} onCheckedChange={(v) => setForm(f => ({ ...f, usar_chat: v === true }))} />
                                Chat (Amigão e Telegram)
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox checked={form.usar_analise} onCheckedChange={(v) => setForm(f => ({ ...f, usar_analise: v === true }))} />
                                Análise de relatórios
                            </label>
                            <p className="text-xs text-muted-foreground">Cada uso tem um modelo só: marcar aqui desmarca o modelo anterior.</p>
                        </fieldset>

                        <Button type="submit" disabled={saving} className="w-full">
                            {saving ? "Salvando..." : editing ? "Atualizar modelo" : "Salvar e testar"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover {deleting?.nome}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            A API key será apagada do cofre.
                            {deleting?.usar_chat || deleting?.usar_analise ? " O chat ou a análise ficarão sem modelo até você marcar outro." : ""}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleDelete() }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Remover
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
