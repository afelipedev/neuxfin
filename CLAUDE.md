# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Dev server on localhost:3000 (runs `next dev --webpack`; Turbopack is intentionally not used, for Tailwind v4 stability)
npm run build    # Production build (also the main type-check)
npm run lint     # ESLint
```

There is no test suite configured.

## Architecture

**NeuxFin** is a personal finance app (PF and PJ finances) built with Next.js 16 (App Router), React 19, and Supabase. User-facing strings, DB tables, and columns are in Portuguese.

### Tech Stack
- **UI**: shadcn/ui (new-york style) with Radix primitives, Tailwind CSS 4, `next-themes` for dark mode, `sonner` toasts
- **Backend**: Supabase (auth + Postgres with RLS)
- **AI**: Vercel AI SDK v6 (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`) using `gpt-4o-mini`
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
- `ai-chat/`: chat window plus `tools/finance-tools.ts`. Each tool has a Zod schema, a `*Core(supabase, ...)` function that takes an injected Supabase client, and a thin wrapper that builds the cookie-based server client. Reuse the `*Core` functions when adding new AI entry points.
- `calculator/`: intelligent calculator with a data selector, toggled by Ctrl/Cmd+K (shortcut wired in the dashboard layout).
- `cofrinhos/` (savings goals), `subscriptions/` (`assinaturas`), `bank-accounts/`, `settings/` (categories, profile), `dashboard/` (sidebar, summary cards, charts), `auth/`.

`src/app/(dashboard)/layout.tsx` is a client layout that mounts `TransactionProvider`, `SidebarProvider`, the AI chat window, and the calculator for all dashboard pages.

### API routes
- `api/chat/route.ts`: streaming chat (`streamText` → `toUIMessageStreamResponse()`) with tools `get_balance`, `get_recent_transactions`, `get_upcoming_bills`, `add_transaction`. It runs as the logged-in user via cookies. The system prompt defines the "Amigão" persona.
- `api/agent/process/route.ts`: non-streaming endpoint (`generateText`) for external automations (WhatsApp text/audio transcripts). It receives `{ message, userId }` and uses a **service-role** Supabase client, so it bypasses RLS and only calls `addTransactionCore`. Callers must send `Authorization: Bearer <AGENT_API_SECRET>`. The check fails closed (401) when the env var is missing.

### Data Model
Tables in use: `transacoes`, `categorias`, `contas_bancarias`, `cartoes_credito`, `assinaturas`, `cofrinhos`, `cofrinho_transacoes`, `perfis`, plus the `avatars` storage bucket. Rows are scoped by `usuario_id` with RLS. There is no migrations folder; the only checked-in schema is `src/features/cofrinhos/database.sql`.

`transacoes`:
- `tipo_transacao`: `'receita' | 'despesa'`. `tipo`: `'PF' | 'PJ'`
- `status`: `'liquidado' | 'pendente' | 'atrasado'`
- Dates: `data_vencimento` (due) and `data_pagamento` (null until paid)
- Installments: `parcela_atual`, `total_parcelas`, `transacao_pai_id`. Recurrence: `is_recorrente`
- FKs: `categoria_id`, `conta_id`, `cartao_id`

### Balance rules (Saldo)
- **Account balance at date D** = `saldo_inicial` + liquidated receitas − liquidated despesas of that account whose `data_pagamento` (fallback `data_vencimento`) ≤ D. Balances are computed, never stored.
- **Saldo Disponível** = sum of all account balances as of today. It does not depend on the month selected in the dashboard.
- **Saldo previsto (end of month)** = Saldo Disponível + pending receitas − pending/overdue despesas with `data_vencimento` ≤ end of the selected month (only those linked to an account).
- Month cards (receitas/despesas do mês) use `data_vencimento` (competência). "Resultado do mês" = receitas − despesas of the month.
- Liquidated transactions without `conta_id` (legacy, AI or subscriptions) do not affect any balance; they are counted and surfaced as a warning.
- Card purchases (`cartao_id` set, no `conta_id`) do not touch balances. Invoices (faturas) are not implemented yet.
- `atrasado` is derived on read (`pendente` and `data_vencimento` < today) via `deriveStatus()`.
- Money is summed in cents (`toCents`/`fromCents`) to avoid float drift.

### Conventions
- Path alias: `@/*` → `src/*`
- `src/components/ui/` contains shadcn primitives. Don't hand-edit them; add new ones with `npx shadcn@latest add <component>`.
- UI accent colors use the `brand-1`, `brand-2`, `brand-3` theme tokens (CSS variables in `src/app/globals.css`).
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
SUPABASE_SERVICE_ROLE_KEY   # Only for /api/agent/process
AGENT_API_SECRET            # Shared secret required by /api/agent/process (Bearer token)
OPENAI_API_KEY              # AI chat and agent
```
