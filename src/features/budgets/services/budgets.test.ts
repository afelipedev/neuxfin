import { describe, expect, it } from 'vitest'
import { budgetStatus, buildBudgetProgress, type Budget, type BudgetExpense } from './budgets'

const budgets: Budget[] = [
    { id: 'b1', categoria_id: 'alimentacao', valor_mensal: '1000', tipo: null },
    { id: 'b2', categoria_id: 'transporte', valor_mensal: 200, tipo: 'PF' },
    { id: 'b3', categoria_id: 'lazer', valor_mensal: 300, tipo: null },
]

const expenses: BudgetExpense[] = [
    { categoria_id: 'alimentacao', valor: 400.1, tipo: 'PF' },
    { categoria_id: 'alimentacao', valor: '450.2', tipo: 'PJ' },
    { categoria_id: 'transporte', valor: 150, tipo: 'PF' },
    { categoria_id: 'transporte', valor: 500, tipo: 'PJ' }, // fora: orçamento só PF
    { categoria_id: 'lazer', valor: 310, tipo: 'PF' },
    { categoria_id: null, valor: 999, tipo: 'PF' },
]

describe('buildBudgetProgress', () => {
    const progress = buildBudgetProgress(budgets, expenses)
    const byId = Object.fromEntries(progress.map(p => [p.budget.id, p]))

    it('soma as despesas da categoria em centavos', () => {
        expect(byId.b1.gasto).toBe(850.3)
        expect(byId.b1.restante).toBe(149.7)
    })

    it('orçamento com perfil conta só as despesas daquele perfil', () => {
        expect(byId.b2.gasto).toBe(150)
        expect(byId.b2.percentual).toBe(0.75)
        expect(byId.b2.status).toBe('ok')
    })

    it('classifica e ordena do mais consumido para o menos', () => {
        expect(progress.map(p => [p.budget.id, p.status])).toEqual([
            ['b3', 'estourado'],
            ['b1', 'atencao'],
            ['b2', 'ok'],
        ])
        expect(byId.b3.restante).toBe(-10)
    })

    it('categoria sem gasto fica em 0%', () => {
        const [p] = buildBudgetProgress([{ id: 'x', categoria_id: 'saude', valor_mensal: 100, tipo: null }], expenses)
        expect([p.gasto, p.percentual, p.status]).toEqual([0, 0, 'ok'])
    })
})

describe('budgetStatus', () => {
    it('limites de 80% e 100%', () => {
        expect(budgetStatus(0.79)).toBe('ok')
        expect(budgetStatus(0.8)).toBe('atencao')
        expect(budgetStatus(1)).toBe('atencao')
        expect(budgetStatus(1.01)).toBe('estourado')
    })
})
