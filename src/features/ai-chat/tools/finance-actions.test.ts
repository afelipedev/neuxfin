import { describe, expect, it } from 'vitest'
import { findByName } from './finance-actions'

describe('findByName', () => {
    const contas = [{ nome: 'Nubank PF' }, { nome: 'Nubank PJ' }, { nome: 'Itaú' }]

    it('ignora acento e caixa, preferindo o nome exato', () => {
        expect(findByName(contas, 'itau')?.nome).toBe('Itaú')
        expect(findByName(contas, 'nubank pj')?.nome).toBe('Nubank PJ')
    })

    it('aceita trecho do nome nos dois sentidos', () => {
        expect(findByName(contas, 'nubank')?.nome).toBe('Nubank PF')
        expect(findByName(contas, 'cartão do Itaú')?.nome).toBe('Itaú')
    })

    it('sem nome ou sem correspondência, nada', () => {
        expect(findByName(contas, '')).toBeUndefined()
        expect(findByName(contas, 'Bradesco')).toBeUndefined()
    })
})
