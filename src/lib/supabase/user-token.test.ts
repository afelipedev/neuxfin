import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { signUserToken } from './user-token'

const USER = '11111111-2222-4333-8444-555555555555'
const SECRET = 'segredo-de-teste-com-tamanho-suficiente'

const decode = (part: string) => JSON.parse(Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString())

describe('signUserToken', () => {
    const token = signUserToken(USER, SECRET, 1_000)
    const [h, p, s] = token.split('.')

    it('gera um JWT HS256 de usuário autenticado com expiração curta', () => {
        expect(decode(h)).toEqual({ alg: 'HS256', typ: 'JWT' })
        expect(decode(p)).toEqual({ sub: USER, role: 'authenticated', aud: 'authenticated', iat: 1_000, exp: 1_300 })
    })

    it('assinatura confere com o segredo (e não com outro)', () => {
        const expected = createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url')
        expect(s).toBe(expected)
        expect(createHmac('sha256', 'outro').update(`${h}.${p}`).digest('base64url')).not.toBe(s)
    })

    it('recusa usuário inválido e segredo vazio', () => {
        expect(() => signUserToken('abc', SECRET)).toThrow('Usuário inválido')
        expect(() => signUserToken(USER, '')).toThrow('JWT secret ausente')
    })
})
