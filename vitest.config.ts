import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
        // Datas "hoje" nos testes são fixadas com vi.setSystemTime; fuso fixo evita off-by-one
        env: { TZ: 'America/Sao_Paulo' },
    },
})
