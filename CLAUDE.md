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
- **Backend**: Supabase (client in `src/lib/supabase.ts`)
- **Charts**: Recharts
- **Forms**: react-hook-form + Zod validation

### Project Structure
- `src/app/` - Next.js App Router pages
  - `(dashboard)/` - Route group for authenticated dashboard views (receitas, despesas, cofrinhos, assinaturas, relatórios)
- `src/features/` - Feature-based modules containing domain components
  - `dashboard/` - Summary cards, sidebar, charts
  - `transactions/` - Transaction forms
  - `ai-chat/` - Floating AI chat window
  - `calculator/` - Intelligent calculator (Ctrl+K shortcut)
- `src/components/ui/` - shadcn/ui primitives (do not modify directly; use `npx shadcn@latest add`)
- `src/lib/` - Utilities (`cn` helper, Supabase client)
- `src/hooks/` - Custom React hooks

### Conventions
- Path alias: `@/*` maps to `src/*`
- UI colors use `neux-1`, `neux-2`, `neux-3` custom theme tokens
- Portuguese language for user-facing strings
- PF (Pessoa Física) / PJ (Pessoa Jurídica) distinction for transaction types

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```
