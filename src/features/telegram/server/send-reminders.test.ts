import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { nowInBrasilia } from './send-reminders'

describe('nowInBrasilia', () => {
    it('converte para o horário de Brasília (UTC-3)', () => {
        expect(nowInBrasilia(new Date('2026-11-09T11:30:00Z'))).toEqual({ hour: 8, today: '2026-11-09', weekday: 1 })
        // 01:00 UTC de terça ainda é segunda à noite em Brasília
        expect(nowInBrasilia(new Date('2026-11-10T01:00:00Z'))).toEqual({ hour: 22, today: '2026-11-09', weekday: 1 })
    })
})
