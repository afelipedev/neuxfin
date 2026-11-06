import { generateText, Output } from 'ai'
import { describeAIError, resolveModel } from '@/features/ai-models/server/resolve-model'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { fetchReport } from '@/features/reports/services/reports'

export const maxDuration = 30

const requestSchema = z.object({
    months: z.union([z.literal(3), z.literal(6), z.literal(12)]).default(6),
})

const insightsSchema = z.object({
    insights: z.array(z.object({
        tipo: z.enum(['positivo', 'atencao', 'dica']),
        titulo: z.string().describe('Título curto, até 60 caracteres'),
        descricao: z.string().describe('Uma ou duas frases com números concretos do relatório'),
    })).describe('De 2 a 4 insights'),
})

/**
 * Análise por IA do relatório do usuário logado (cookie → RLS).
 * Envia ao modelo apenas números agregados, nunca descrições de lançamentos.
 */
export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return Response.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const parsed = requestSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
        return Response.json({ error: 'Período inválido' }, { status: 400 })
    }

    try {
        const resolved = await resolveModel(user.id, { usage: 'analise' })
        const report = await fetchReport(supabase, parsed.data.months)

        const resumo = {
            periodo_meses: parsed.data.months,
            receitas: report.receitas,
            despesas: report.despesas,
            resultado: report.resultado,
            taxa_poupanca_pct: report.taxa_poupanca,
            comprometimento_fixo_pct: report.comprometimento,
            autonomia_meses: report.autonomia_meses,
            despesa_media_mensal: report.despesa_media_mensal,
            saldo_disponivel: report.saldo_disponivel,
            total_cofrinhos: report.total_cofrinhos,
            meses: report.months.map(m => ({ mes: m.name, receitas: m.receitas, despesas: m.despesas, pj: m.pj })),
            top_categorias: report.categorias.slice(0, 6).map(c => ({ categoria: c.name, total: c.value, variacao_ultimo_mes_pct: c.variacao })),
            metas_cofrinhos: report.cofrinhos.map(c => ({ meta: c.nome, progresso_pct: c.progresso, objetivo: c.objetivo })),
        }

        const { output } = await generateText({
            model: resolved.model,
            providerOptions: resolved.providerOptions,
            output: Output.object({ schema: insightsSchema }),
            system: `Você é um analista financeiro pessoal brasileiro. Analise o resumo e gere de 2 a 4 insights
objetivos, em português do Brasil, usando SOMENTE os números fornecidos (nunca invente valores).
Formate valores como R$ 1.234,56. Seja direto e prático; inclua pelo menos uma dica acionável.
O mês mais recente pode estar incompleto (mês corrente): não conclua tendências só por ele.`,
            prompt: JSON.stringify(resumo),
        })

        return Response.json({ insights: output.insights.slice(0, 4), geradoEm: new Date().toISOString() })
    } catch (error) {
        console.error('[api/insights]', error)
        const { message, status } = describeAIError(error)
        return Response.json({ error: message }, { status })
    }
}
