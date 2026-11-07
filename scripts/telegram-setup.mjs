#!/usr/bin/env node
/**
 * Registra o webhook do bot do Telegram e a lista de comandos.
 *
 * Uso:
 *   TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... node scripts/telegram-setup.mjs https://seu-app.vercel.app
 *   node --env-file=.env.local scripts/telegram-setup.mjs https://seu-app.vercel.app
 *   node --env-file=.env.local scripts/telegram-setup.mjs --info   (mostra o webhook atual)
 *
 * O Telegram envia o TELEGRAM_WEBHOOK_SECRET no header X-Telegram-Bot-Api-Secret-Token
 * de cada update; a rota /api/telegram/webhook recusa requisições sem ele.
 */

const token = process.env.TELEGRAM_BOT_TOKEN
const secret = process.env.TELEGRAM_WEBHOOK_SECRET
const arg = process.argv[2]

if (!token) {
    console.error('Defina TELEGRAM_BOT_TOKEN (token do @BotFather).')
    process.exit(1)
}

async function call(method, body) {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
    })
    const json = await res.json()
    if (!json.ok) throw new Error(`${method}: ${json.description}`)
    return json.result
}

if (arg === '--info' || !arg) {
    const info = await call('getWebhookInfo')
    console.log(JSON.stringify({ ...info, url: info.url || '(nenhum)' }, null, 2))
    if (!arg) console.log('\nPara registrar: node scripts/telegram-setup.mjs https://seu-app.vercel.app')
    process.exit(0)
}

if (!secret || !/^[A-Za-z0-9_-]{16,256}$/.test(secret)) {
    console.error('Defina TELEGRAM_WEBHOOK_SECRET com 16 a 256 caracteres [A-Za-z0-9_-]. Ex.: openssl rand -hex 32')
    process.exit(1)
}

const base = arg.replace(/\/+$/, '')
if (!base.startsWith('https://')) {
    console.error('A URL precisa ser https (o Telegram não aceita http).')
    process.exit(1)
}

const url = `${base}/api/telegram/webhook`
await call('setWebhook', {
    url,
    secret_token: secret,
    allowed_updates: ['message'],
    drop_pending_updates: true,
})
await call('setMyCommands', {
    commands: [
        { command: 'saldo', description: 'Saldo das contas e resumo do mês' },
        { command: 'ajuda', description: 'Exemplos do que posso fazer' },
        { command: 'desvincular', description: 'Desconectar este Telegram do NeuxFin' },
    ],
})
const me = await call('getMe')
console.log(`Webhook registrado em ${url} para @${me.username}.`)
console.log(`Configure NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=${me.username} no .env e na Vercel.`)
