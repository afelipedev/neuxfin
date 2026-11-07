# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Dev server on localhost:3000 (runs `next dev --webpack`; Turbopack is intentionally not used, for Tailwind v4 stability)
npm run build    # Production build (also the main type-check)
npm run lint     # ESLint
npm test         # Vitest (unit tests, single run); `npm run test:watch` for watch mode
npx vitest run src/features/credit-cards  # run tests under one folder
```

Tests are Vitest (`vitest.config.ts`, node environment, `@/` alias, `TZ=America/Sao_Paulo`). They live next to the code as `*.test.ts` and cover the pure financial rules: `balances`, `invoices`, `reports`, `dashboard-alerts` and `lib/utils`. Pass `today`/dates explicitly to the pure functions instead of mocking the clock. When changing a balance, invoice or report rule, update or add the matching test.

## Architecture

**NeuxFin** is a personal finance app (PF and PJ finances) built with Next.js 16 (App Router), React 19, and Supabase. User-facing strings, DB tables, and columns are in Portuguese.

### Tech Stack
- **UI**: shadcn/ui (new-york style) with Radix primitives, Tailwind CSS 4, `next-themes` for dark mode, `sonner` toasts
- **Backend**: Supabase (auth + Postgres with RLS)
- **AI**: Vercel AI SDK v6 (`ai`, `@ai-sdk/groq`, `@ai-sdk/openai`, `@ai-sdk/react`). The model is chosen per user in Configurações → IA (default suggestion: Groq `openai/gpt-oss-20b`)
- **Charts**: Recharts. **Forms**: react-hook-form + Zod 4. **Export**: `xlsx`

### Auth and Supabase clients
- `src/proxy.ts` is the Next 16 replacement for `middleware.ts`. It refreshes the Supabase session and redirects unauthenticated users to `/login` (everything except `/login`, `/register`, `/auth/*` requires auth). Logged-in users hitting auth pages are redirected to `/`.
- `src/lib/supabase/client.ts` is the browser client; `src/lib/supabase/server.ts` is the cookie-based server client.
- Most data access happens **client-side**: `src/features/*/services/*.ts` call the browser client directly (instantiated at module level), relying on RLS for per-user isolation. Hooks in `features/*/hooks` wrap these services.
- `src/features/auth/actions/auth.ts` holds server actions; `src/app/auth/callback` handles the OAuth/email callback.

### Feature modules (`src/features/`)
Each feature groups `components/`, `hooks/`, `services/` (and sometimes `context/`). Pages in `src/app/(dashboard)/*` are thin and compose feature components.

- `bank-accounts/`: `services/balances.ts` is the **single source of truth** for balance math (pure functions, no Supabase). `useBankAccounts`, `getDashboardStats`, the account statement page (`/contas/[id]`) and the AI `get_balance` tool all use it. Never re-implement balance sums elsewhere.
- `transactions/`: core CRUD for `transacoes` plus month stats in `services/transactions.ts`. `TransactionContext` exposes an `updateCounter` plus `notifyTransactionChange()`. Any component that mutates transactions must call `notifyTransactionChange()`, and data-fetching hooks include `updateCounter` in their deps so dashboard widgets, lists, and charts refetch. Use `useTransactionContextOptional()` in components that may render outside the provider.
- `ai-chat/`: chat window plus the AI tools. `tools/finance-tools.ts` (balance, upcoming bills, add transaction, also card purchases via `cartao_nome`) and `tools/finance-insights.ts` (subscriptions, cards, cofrinhos, budgets, spending by category, transaction search, mark as paid) hold Zod schemas and `*Core(supabase, ..., userId)` functions. `tools/finance-actions.ts` holds the write actions (`pay_invoice` via RPC `pagar_fatura`, `savings_movement` via `registrar_movimento_cofrinho`, `set_budget`/`remove_budget`, `transfer`, `delete_transaction`): every one returns only a preview (`precisa_confirmacao` + `resumo`) unless called with `confirmado: true`, which the prompt allows only after an explicit "sim". `add_transaction` accepts `parcelas` (2-48, `valor` = total) using the pure `transactions/services/installments.ts` → `buildInstallments` (also used by the app). `tools/finance-toolset.ts` → `buildFinanceTools(supabase, userId)` + `FINANCE_TOOLS_GUIDE` is the single tool set used by `api/chat` and the Telegram bot: add new tools there (with a `*Core` that goes through `scopeToUser`) and add it to `finance-tools.scope.test.ts`.
- `calculator/`: intelligent calculator with a data selector, toggled by Ctrl/Cmd+K (shortcut wired in the dashboard layout).
- `credit-cards/`: `services/invoices.ts` computes faturas (pure functions: cycle, status, limit used) plus `fetchCardsOverview`, `payInvoice` and `reverseInvoicePayment`. Pages `/cartoes` and `/cartoes/[id]`.
- `budgets/`: `orcamentos` (monthly limit per expense category, optional PF/PJ). `services/budgets.ts` → `buildBudgetProgress` is pure: spent = despesas of the month by `data_vencimento` (paid or not, card purchases included); status `ok` < 80% ≤ `atencao` ≤ 100% < `estourado`. Page `/orcamentos`; `buildAlerts` turns `atencao`/`estourado` into dashboard alerts. One active budget per category (partial unique index), soft delete via `removido_em`.
- `reports/`: `services/reports.ts` (`buildReport` is pure) feeds `/relatorios` and `api/insights`. `dashboard/services/dashboard-alerts.ts` builds the dashboard's upcoming payments and health alerts.
- `ai-models/`: per-user LLM config (Configurações → IA, `?tab=ia`). `server/resolve-model.ts` → `resolveModel(userId, { usage: 'chat' | 'analise' } | { modelId })` returns the AI SDK model plus `providerOptions`; it reads the key through the service-role-only RPC `obter_modelo_ia`, falling back to `GROQ_API_KEY`/`OPENAI_API_KEY` when no model is configured. `describeAIError()` maps provider errors to user-facing messages. Every AI route must use `resolveModel`, never a hardcoded provider. The client service never reads keys (only `chave_final`).
- `telegram/`: Telegram bot (financial assistant). `server/parse.ts` is pure (update → command/text/voice, `/saldo` message, splitting). `server/handle-update.ts` links the chat (`/start <code>` → RPC `vincular_telegram`), answers `/saldo`, `/ajuda`, `/desvincular`, transcribes voice (Whisper via `resolveTranscriptionModel`) and runs `server/agent.ts` (`generateText` + `buildFinanceTools`, with the last 30 minutes of the chat from `telegram_mensagens` as context; kept 7 days). Financial data is read/written with `createUserScopedClient(userId)` (`src/lib/supabase/user-token.ts`: short-lived HS256 JWT signed with `SUPABASE_JWT_SECRET`), so RLS isolates the bot exactly like the app; the service role is used only for `telegram_*` tables and `obter_modelo_ia`. Every `*Core` call still passes `userId` (`scopeToUser`, second layer; `finance-tools.scope.test.ts` fails if a query goes out without `usuario_id`). Proactive reminders: pg_cron job `lembretes-telegram` (hourly) calls `public.disparar_lembretes_telegram()`, which POSTs to `/api/telegram/lembretes` with the Vault secret `lembretes_secret` in `x-lembretes-secret` (checked by `validar_segredo_lembretes`, service_role only; the secret never leaves the database). The route answers 202 and, in `after()`, `server/send-reminders.ts` sends one message per user whose `telegram_vinculos.lembrete_hora` (Brasília, 6-22) is the current hour: data loaded with the user-scoped client, items from the pure `server/reminders.ts` → `buildReminders` (overdue of the last 7 days one by one, older overdue as one weekly line, due today/tomorrow, receivables today, invoices due in 3 days, card subscriptions tomorrow, budgets at 80%/over once per month, weekly summary on Mondays), deduped through `telegram_lembretes_enviados` (90-day retention). Body `{ "usuario_id": "<uuid>" }` forces one user for testing. `/lembretes on|off` and Settings → Telegram control `lembretes_ativos`, `lembrete_hora`, `resumo_semanal` (RPC `salvar_preferencias_telegram`). Settings tab `?tab=telegram` generates a one-time code (`gerar_codigo_telegram`, 10 min, only the hash is stored) and polls until linked.
- `cofrinhos/` (savings goals; `services/projection.ts` projects balances at 100% of the CDI set in `perfis.configurar_cdi`, compound, no new deposits. Never hardcode a rate; `DEFAULT_CDI_ANUAL` is only the fallback), `subscriptions/` (`assinaturas`: `services/schedule.ts` → `subscriptionOccurrences()` decides the charge dates per frequency anchored on `data_inicio`, day clamped to month end, never after `data_fim` (optional end date; an `ativo` subscription past `data_fim` is shown as `encerrado` via `displaySubscriptionStatus` and leaves the monthly cost); `generateExpensesFromSubscriptions` upserts with `ignoreDuplicates` on `(assinatura_id, data_vencimento)`, so it is idempotent and runs automatically via `SubscriptionAutoGenerator` in the dashboard layout and after saving a subscription. Account: card → `assinaturas.conta_id` → default account), `bank-accounts/`, `settings/` (categories, profile), `dashboard/` (sidebar, summary cards, charts), `auth/`.

`src/app/(dashboard)/layout.tsx` is a client layout that mounts `TransactionProvider`, `SidebarProvider`, the AI chat window, the calculator and `SubscriptionAutoGenerator` for all dashboard pages. Header components live in `dashboard/components/header-*.tsx`: search (`searchTransactions`, opens `EditTransactionDialog` in controlled mode or sends the text to the chat via `pendingQuestion`; `/` focuses it), notifications (`useDashboardAlerts`) and the user menu (profile + logout).

### API routes
- `api/chat/route.ts`: streaming chat (`streamText` → `toUIMessageStreamResponse()`) with the tools from `buildFinanceTools`. It converts UI messages with `convertToModelMessages` and uses `stopWhen: stepCountIs(5)` so the model answers after tool calls. It runs as the logged-in user via cookies. The system prompt defines the "Amigão" persona.
- `api/chat` and `api/insights` require a logged-in user (401) and resolve the model with usage `chat` / `analise`. `api/ai-models/test` runs a minimal call to validate a saved model.
- `api/telegram/webhook/route.ts`: Telegram webhook. Validates `X-Telegram-Bot-Api-Secret-Token` against `TELEGRAM_WEBHOOK_SECRET` (fails closed), dedupes by `update_id` (`telegram_updates`), answers 200 right away and processes in `after()`. Register it with `node --env-file=.env.local scripts/telegram-setup.mjs https://<domain>`. `src/proxy.ts` lets `SECRET_AUTH_ROUTES` (the Telegram routes) through without a session.
- `api/insights/route.ts`: AI analysis for `/relatorios` (`generateText` + `Output.object`). It sends only aggregated report numbers to the model.
- There is no WhatsApp/n8n endpoint anymore (removed in Fase 7); Telegram is the only external channel.

### Data Model
Tables in use: `transacoes`, `categorias`, `contas_bancarias`, `cartoes_credito`, `assinaturas`, `cofrinhos`, `cofrinho_transacoes`, `transferencias`, `faturas_pagamentos`, `ajustes_saldo`, `orcamentos`, `modelos_ia`, `telegram_vinculos`, `telegram_updates`, `telegram_mensagens`, `telegram_lembretes_enviados`, `perfis`, plus the `avatars` storage bucket. Rows are scoped by `usuario_id` with RLS (policies are `to authenticated` with `(select auth.uid())` and `WITH CHECK`).

**Isolation and hardening (Fase 7):** `anon` has no privilege on any `public` table/view (default privileges too); trigger functions are not callable via RPC; every cross-table link is validated by owner in triggers (FKs bypass RLS). `supabase/tests/isolamento.sql` creates two throwaway users and checks reads/updates/inserts/RPCs across them plus `anon` (run it with `execute_sql`; it ends in `RAISE EXCEPTION`, expected message `ISOLAMENTO OK`). Run it after any schema or policy change. Avatars live in `avatars/<uid>/...` (policies per folder, images ≤ 2 MB). `next.config.ts` sends security headers (HSTS, frame-ancestors none, nosniff, referrer and permissions policy).

Migrations from 2026-11 onward live in `supabase/migrations/` and their filenames match the remote migration history (earlier ones exist only in Supabase). Integrity rules enforced in the database:
- `transacoes`: `status` ∈ liquidado/pendente/atrasado, `valor > 0`, `liquidado ⇔ data_pagamento IS NOT NULL`, and `conta_id`/`cartao_id`/`categoria_id` must belong to the same user (trigger).
- Deleting a bank account with linked transactions is blocked (trigger). Transfers and cofrinho movements use `ON DELETE RESTRICT`. Transfers can be edited (`updateTransfer`); the trigger revalidates both accounts.
- Deleting a cofrinho with balance and account-linked movements is blocked (trigger).
- Cofrinho aporte/resgate must go through the RPC `registrar_movimento_cofrinho` (atomic, row lock, balance check). Never update `cofrinhos.saldo_atual` from the client.
- Invoice payment must go through the RPC `pagar_fatura(..., p_valor)` (records `faturas_pagamentos` and settles the purchases, setting `fatura_pagamento_id`). `p_valor` null pays everything; a smaller value is a partial payment: the rest is stored in `saldo_restante` and shows up as `saldo_anterior` of the next invoice (counted in its `em_aberto` and in the card limit until that invoice is paid; it is not a purchase or despesa). Reversal goes through `estornar_fatura` (soft, `estornado_em`); a partial payment whose rest was already paid by the next invoice can't be reversed first. At most one active payment per card and month.
- `telegram_vinculos`: one row per user; `authenticated` can only SELECT `telegram_username`, `vinculado_em`, `codigo_expira_em`. Linking goes through `gerar_codigo_telegram` / `desvincular_telegram` (authenticated) and `vincular_telegram` (service_role only).
- `modelos_ia`: API keys live in Supabase Vault (`chave_secret_id`); `authenticated` can only SELECT the non-secret columns and writes go through the RPCs `salvar_modelo_ia` (create/update, empty key keeps the current one, marking a usage unsets it on the other models) and `remover_modelo_ia` (soft delete that overwrites the Vault secret). At most one active model per usage (`usar_chat`, `usar_analise`) per user.
- Deleting a credit card with purchases is blocked (trigger). `contas_bancarias.padrao` allows at most one default account per user (partial unique index): unset the old default before setting a new one.
- Recurring series ("Repetir todo mês") are created in a single INSERT by `createRecurringTransactions` (pure builder in `transactions/services/recurrence.ts`), share `recorrencia_id`, and can be deleted "this and next" with `deleteRecurrenceFrom` (keeps purchases already paid by an invoice). `transacoes.assinatura_id` links subscription expenses (unique per due date).
- Installments are created in a single INSERT, with the parent id generated client-side. Deleting the parent installment alone re-links the others first, because the `transacao_pai_id` FK cascades.

**Supabase MCP:** `apply_migration`/`execute_sql` auto-decline statements they consider destructive (`DROP ...`, and also `DELETE` even inside a function body) in this environment. Prefer soft deletes (timestamp column). Use `ALTER POLICY`/`ALTER VIEW`/`CREATE OR REPLACE`/`REVOKE`, or add a new constraint instead of dropping the old one. Test risky SQL with `execute_sql` inside `begin; ... rollback;`.

`transacoes`:
- `tipo_transacao`: `'receita' | 'despesa'`. `tipo`: `'PF' | 'PJ'`
- `status`: `'liquidado' | 'pendente' | 'atrasado'`
- Dates: `data_vencimento` (due) and `data_pagamento` (null until paid)
- Installments: `parcela_atual`, `total_parcelas`, `transacao_pai_id`. Recurrence: `is_recorrente`
- FKs: `categoria_id`, `conta_id`, `cartao_id`

### Balance rules (Saldo)
- **Account balance at date D** = `saldo_inicial` + liquidated receitas − liquidated despesas of that account whose `data_pagamento` (fallback `data_vencimento`) ≤ D, ± transfers (`transferencias`: destination +, origin −), ± cofrinho movements with `conta_id` (resgate +, aporte −), ± balance adjustments (`ajustes_saldo.valor`, signed, ignoring `removido_em`). When `data_saldo_inicial` is set, movements before it are ignored. Balances are computed, never stored.
- Transfers and balance adjustments are not receitas/despesas and never appear in the monthly totals. Reconciliation ("Ajustar saldo" on `/contas/[id]` and in Configurações → Contas) stores `reconciliationDelta(calculated, informed)` as an adjustment; undoing it is a soft delete.
- **Saldo Disponível** = sum of all account balances as of today. It does not depend on the month selected in the dashboard.
- **Saldo previsto (end of month)** = Saldo Disponível + pending receitas − pending/overdue despesas with `data_vencimento` ≤ end of the selected month (only those linked to an account).
- Month cards (receitas/despesas do mês) use `data_vencimento` (competência). "Resultado do mês" = receitas − despesas of the month.
- Liquidated transactions without `conta_id` (legacy, AI or subscriptions) do not affect any balance; they are counted and surfaced as a warning.
- Card purchases (`cartao_id` set, no `conta_id`) do not touch balances. Their `data_vencimento` is the purchase date, and they never become `atrasado` on their own (the invoice is what falls due).
- **Faturas** are computed, not stored:
  - Cycle: a purchase made on or after the card's `dia_fechamento` goes to the next invoice. The invoice falls due in the same month as its closing date when `dia_vencimento > dia_fechamento`, otherwise in the following month. The invoice's competência is its due month.
  - Paying an invoice debits one account. It is not a despesa: the purchase was already counted in its own month.
  - Saldo previsto also subtracts open invoices due by the end of the month.
  - Card limit used = open purchases, including future installments, plus partial-payment rests not yet paid.
  - Invoice status `parcial` = paid with `saldo_restante > 0`.
- `atrasado` is derived on read (`pendente` and `data_vencimento` < today) via `deriveStatus()`.
- Money is summed in cents (`toCents`/`fromCents`) to avoid float drift.

### Conventions
- Path alias: `@/*` → `src/*`
- Money display: always `formatCurrency()` from `@/lib/utils` (`{ fractionDigits: 0 }` for chart labels). Don't create local `Intl.NumberFormat`.
- Errors: use `catch (e)` (no `any`) with `getErrorMessage(e)`, `toError(e)` and `getErrorCode(e)` from `@/lib/utils`. `no-explicit-any` is an error in lint and the codebase has none.
- `src/components/ui/` contains shadcn primitives. Don't hand-edit them; add new ones with `npx shadcn@latest add <component>`.
- **Design system:** read `docs/design-system.md` before writing UI. Colors are tokens only: `primary` (CTA fill), `brand-1` primary/teal, `brand-2` secondary/indigo (PF, subscriptions, AI), `brand-3` tertiary/orange (PJ, cofrinhos), and semantic `success` (income/paid), `warning` (pending), `destructive` (expense/overdue), `info`. No raw Tailwind palette colors (`emerald-500`, `zinc-900/5`), hex, `text-[10px]` (minimum is `text-2xs`) or `font-black`. Single font family: Outfit. Dates always use `DatePicker` from `@/components/ds` (never `<Input type="date">`). Motion: `stagger`, `lift`, `animate-pop` utilities and `StatCard amount={n}` (count-up). Reuse `@/components/ds` (`PageHeader`, `StatCard`/`StatGrid`, `SectionCard`, `MonthStepper`, `Amount`, `ToneBadge`, `TransactionStatusBadge`, `ProfileBadge`, `IconTile`, `EmptyState`).
- **Mobile/PWA:** below `md` tables become lists (`md:hidden` list + `hidden md:block` table); use `dvh`, not `vh`; icon row actions use `size="icon-sm"` (touch targets are enlarged globally on coarse pointers). Navigation lives in `features/dashboard/nav-items.ts` (sidebar + mobile bottom bar). PWA files: `src/app/manifest.ts`, `public/sw.js` (never caches `/api`, `/auth` or Supabase data), `public/offline.html`, icons from `scripts/generate-icons.py`.
- Dates are stored as `YYYY-MM-DD` strings. Always use `parseLocalDate()` and `formatDateToISO()` from `@/lib/utils` instead of `new Date(str)` / `toISOString()` to avoid timezone off-by-one bugs.
- `.agent/skills/` is a vendored third-party skills catalog, not app code.

## Project skills (`.agent/skills/skills/`)
Before working in one of these areas, read the matching `SKILL.md` (and its `rules/` or `AGENTS.md` when present) and follow it:

| Area | Skill |
| --- | --- |
| Supabase Postgres: SQL, views, RPCs, indexes, RLS | `postgres-best-practices` |
| Schema design and migrations (`supabase/migrations/`) | `database-design`, `database-migrations-sql-migrations` |
| Supabase auth, `proxy.ts`, server/browser clients | `nextjs-supabase-auth` |
| Next.js App Router routes, layouts, data fetching | `nextjs-app-router-patterns` |
| React/Next performance (re-renders, waterfalls, bundle) | `react-best-practices` |
| TypeScript typing, removing `any` | `typescript-expert` |
| UI with shadcn/Radix + Tailwind 4 | `radix-ui-design-system`, `tailwind-patterns` |
| Unit tests (Vitest) for financial rules | `javascript-testing-patterns`, `testing-patterns` |
| Bug investigation | `systematic-debugging` |
| `/api/*` routes, secrets, service-role usage | `api-security-best-practices` |

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   # Server only: Telegram link/history tables, AI keys (obter_modelo_ia). Never for financial data
SUPABASE_JWT_SECRET         # Server only: signs short-lived user tokens (createUserScopedClient) so the bot runs under RLS
GROQ_API_KEY / OPENAI_API_KEY  # Optional fallback when the user has no model configured in Configurações → IA
TELEGRAM_BOT_TOKEN          # Bot token from @BotFather (server only)
TELEGRAM_WEBHOOK_SECRET     # Secret sent by Telegram in X-Telegram-Bot-Api-Secret-Token (16-256 chars [A-Za-z0-9_-])
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME  # Bot username without @, used for the t.me deep link
```
