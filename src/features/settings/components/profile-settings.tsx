"use client"

import * as React from "react"
import { User, Mail, Save, Image as ImageIcon, Percent } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

const supabase = createClient()

export function ProfileSettings() {
    const [profile, setProfile] = React.useState({
        nome: "",
        email: "",
        configurar_cdi: 13.15,
        avatar_url: ""
    })
    const [loading, setLoading] = React.useState(true)
    const [saving, setSaving] = React.useState(false)
    const [uploading, setUploading] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    React.useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data, error } = await supabase
                    .from('perfis')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                if (data) {
                    setProfile({
                        nome: data.nome || "",
                        email: data.email || user.email || "",
                        configurar_cdi: data.configurar_cdi || 13.15,
                        avatar_url: data.avatar_url || ""
                    })
                }
            }
            setLoading(false)
        }
        fetchProfile()
    }, [])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Não autenticado")

            const { error } = await supabase
                .from('perfis')
                .update({
                    nome: profile.nome,
                    configurar_cdi: profile.configurar_cdi,
                    avatar_url: profile.avatar_url
                })
                .eq('id', user.id)

            if (error) throw error

            toast.success("Perfil atualizado", {
                description: "Suas alterações foram salvas com sucesso."
            })
        } catch (error) {
            toast.error("Erro ao salvar", {
                description: "Não foi possível atualizar o perfil."
            })
        } finally {
            setSaving(false)
        }
    }

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Não autenticado")

            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}-${Date.now()}.${fileExt}`

            console.log('Uploading file:', fileName, 'to bucket: avatars')

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true
                })

            if (uploadError) {
                console.error('Upload error:', uploadError)
                throw uploadError
            }

            console.log('Upload successful:', uploadData)

            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName)

            const publicUrl = urlData.publicUrl
            console.log('Public URL:', publicUrl)

            setProfile(prev => ({ ...prev, avatar_url: publicUrl }))

            // Auto-save the avatar_url to profile
            const { error: updateError } = await supabase
                .from('perfis')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id)

            if (updateError) {
                console.error('Profile update error:', updateError)
                throw updateError
            }

            toast.success("Foto atualizada", {
                description: "Sua foto de perfil foi atualizada com sucesso."
            })
        } catch (error: any) {
            console.error('Avatar upload error:', error)
            toast.error("Erro no upload", {
                description: error.message || "Não foi possível enviar a imagem."
            })
        } finally {
            setUploading(false)
        }
    }

    if (loading) return <div className="text-center py-10 text-muted-foreground">Carregando perfil...</div>

    return (
        <div className="max-w-2xl space-y-6">
            <Card className="border-none bg-zinc-900/5 dark:bg-zinc-100/5 shadow-none">
                <CardHeader>
                    <CardTitle>Seu Perfil</CardTitle>
                    <CardDescription>Gerencie suas informações pessoais e preferências do sistema</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative group">
                                    <div className="h-32 w-32 rounded-3xl bg-gradient-to-tr from-brand-1 to-brand-3 flex items-center justify-center text-zinc-950 text-4xl font-black border-4 border-background shadow-xl overflow-hidden">
                                        {profile.avatar_url ? (
                                            <img src={profile.avatar_url} alt={profile.nome} className="h-full w-full object-cover" />
                                        ) : (
                                            profile.nome ? profile.nome.substring(0, 2).toUpperCase() : "UF"
                                        )}
                                    </div>
                                    {uploading && (
                                        <div className="absolute inset-0 bg-black/50 rounded-3xl flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    className="text-[10px] uppercase font-bold tracking-widest h-8"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                >
                                    <ImageIcon className="mr-2 h-3 w-3" /> {uploading ? "Enviando..." : "Alterar Foto"}
                                </Button>
                            </div>

                            <div className="flex-1 space-y-4 w-full">
                                <div className="space-y-2">
                                    <Label htmlFor="nome">Nome Completo</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="nome"
                                            className="pl-10"
                                            placeholder="Seu nome"
                                            value={profile.nome}
                                            onChange={(e) => setProfile({ ...profile, nome: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">E-mail</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            className="pl-10 bg-zinc-900/5 dark:bg-zinc-100/5 cursor-not-allowed"
                                            value={profile.email}
                                            disabled
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">O e-mail não pode ser alterado por aqui.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="cdi">Taxa CDI Base (%)</Label>
                                    <div className="relative">
                                        <Percent className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="cdi"
                                            type="number"
                                            step="0.01"
                                            className="pl-10"
                                            value={profile.configurar_cdi}
                                            onChange={(e) => setProfile({ ...profile, configurar_cdi: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">Usada para calcular rendimentos nos cofrinhos.</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-border/50">
                            <Button type="submit" disabled={saving} className="bg-brand-1 hover:bg-brand-2 text-zinc-950 font-bold min-w-[140px]">
                                {saving ? "Salvando..." : <><Save className="mr-2 h-4 w-4" /> Salvar Alterações</>}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
