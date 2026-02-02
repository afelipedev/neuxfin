# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

## Architecture

**NeuxFin** is a personal finance management application built with Next.js 16 (App Router) and React 19.

### Tech Stack
- **UI**: shadcn/ui (new-york style) with Radix primitives, Tailwind CSS 4
- **Backend**: Supabase (`src/lib/supabase/client.ts` for browser, `src/lib/supabase/server.ts` for server)
- **AI**: Vercel AI SDK with OpenAI gpt-4o-mini for AI chat agent
- **Charts**: Recharts
- **Forms**: react-hook-form + Zod validation

### Project Structure
- `src/app/` - Next.js App Router pages
  - `(auth)/` - Login and registration pages
  - `(dashboard)/` - Authenticated dashboard views (receitas, despesas, cofrinhos, assinaturas, relatórios, configuracoes)
  - `api/chat/` - AI chat streaming endpoint with tool-calling (get_balance, get_recent_transactions, add_transaction)
- `src/features/` - Feature-based modules with components, hooks, services, and context
  - `transactions/` - Transaction CRUD, services (`transactions.ts`), hooks (`use-transactions.ts`), and `TransactionContext` for cross-component state sync
  - `ai-chat/` - Chat window + `tools/finance-tools.ts` (AI tool implementations with Zod schemas)
  - `calculator/` - Intelligent calculator with data selector (Ctrl+K shortcut)
- `src/components/ui/` - shadcn/ui primitives (do not modify directly; use `npx shadcn@latest add`)
- `src/lib/utils.ts` - `cn()` helper, `parseLocalDate()`, `formatDateToISO()` for timezone-safe date handling

### Data Model
Database table: `transacoes` with foreign keys to `categorias`, `contas`, `cartoes`
- **Transaction types**: `tipo_transacao` = 'receita' | 'despesa'
- **Account types**: `tipo` = 'PF' (Pessoa Física) | 'PJ' (Pessoa Jurídica)
- **Status**: 'liquidado' | 'pendente' | 'atrasado'
- Supports installments (`parcela_atual`, `total_parcelas`, `transacao_pai_id`)

### Conventions
- Path alias: `@/*` maps to `src/*`
- UI colors use `brand-1`, `brand-2`, `brand-3` theme tokens (CSS variables)
- Portuguese language for user-facing strings
- Use `parseLocalDate()` and `formatDateToISO()` from `@/lib/utils` to avoid timezone issues with dates

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
OPENAI_API_KEY          # For AI chat
```
