import { describe, expect, it } from 'vitest'
import { authErrorMessage, passwordProblem, safeNextPath } from './password-policy'

describe('passwordProblem', () => {
    it('exige 8+ caracteres com letras e números', () => {
        expect(passwordProblem('abc123')).toMatch('8 caracteres')
        expect(passwordProblem('12345678')).toMatch('letra')
        expect(passwordProblem('abcdefgh')).toMatch('número')
        expect(passwordProblem('senha123')).toBeNull()
    })
})

describe('authErrorMessage', () => {
    it('traduz pelo código e nunca repassa a mensagem original', () => {
        expect(authErrorMessage({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe('E-mail ou senha incorretos.')
        expect(authErrorMessage({ message: 'Password should contain at least one character of each' })).toMatch('Senha fraca')
        expect(authErrorMessage({ code: 'x', message: 'internal db detail' })).toBe('Não foi possível concluir. Tente novamente.')
    })
})

describe('safeNextPath', () => {
    it('aceita só caminhos internos', () => {
        expect(safeNextPath('/dashboard')).toBe('/dashboard')
        expect(safeNextPath('/configuracoes?tab=telegram')).toBe('/configuracoes?tab=telegram')
    })

    it('bloqueia open redirect', () => {
        for (const evil of ['https://evil.com', '//evil.com', '/\\evil.com', '@evil.com', 'evil.com', '', null]) {
            expect(safeNextPath(evil)).toBe('/')
        }
    })
})
