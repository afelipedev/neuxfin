# NeuxFin Design System

Referência para quem escreve UI no NeuxFin (web, mobile e PWA). Tokens em
[`src/app/globals.css`](../src/app/globals.css), componentes em
[`src/components/ds/`](../src/components/ds/) (importe de `@/components/ds`).

**Regra de ouro:** nada de cores do Tailwind (`emerald-500`, `rose-600`, `zinc-900/5`…),
hex soltos, tamanhos `text-[10px]` ou raios `rounded-[2rem]` em código de feature.
Se faltar algo, crie o token ou o componente aqui primeiro.

---

## 1. Cores

Todos os tokens são **seguros para texto** no tema ativo (contraste ≥ 4,5:1 sobre
`background` e `card`, validado nos dois temas). Fundo suave = mesmo token com opacidade.

### Marca

| Papel | Token | Claro | Escuro | Uso |
| --- | --- | --- | --- | --- |
| CTA (preenchimento) | `primary` / `primary-foreground` | `#26c8a6` / `#04241d` | igual | Botão principal, FAB, navegação ativa |
| **Primária** — Teal Neux | `brand-1` | `#0a7d68` | `#2dd4b0` | Marca, saldo, links de destaque, item ativo |
| **Secundária** — Indigo | `brand-2` | `#4f46e5` | `#a5b4fc` | Perfil **PF**, assinaturas, IA |
| **Terciária** — Laranja | `brand-3` | `#c2410c` | `#fb923c` | Perfil **PJ**, cofrinhos/reservas |

> `primary` (preenchimento) e `brand-1` (texto) são o mesmo teal em intensidades diferentes:
> o teal vivo tem só 2,1:1 sobre branco, então texto teal no tema claro usa o tom escuro.

### Semânticas (significado financeiro)

| Token | Significado | Exemplos |
| --- | --- | --- |
| `success` | Entrada / pago / positivo | Receitas, "Pago", "Recebido", saldo positivo |
| `warning` | Pendente / atenção | "Pendente", fatura fechada, despesas a pagar |
| `destructive` | Saída / atraso / erro / excluir | Despesas, "Atrasado", saldo negativo, ações destrutivas |
| `info` | Informativo / em aberto | Fatura aberta, "A receber", dicas da IA |

Cada uma tem `*-foreground` para uso sobre preenchimento sólido.

### Neutros (shadcn)

`background` · `card` · `popover` · `muted` (superfície secundária) · `secondary` / `accent`
(hover neutro) · `border` · `input` · `ring` · `muted-foreground` (texto de apoio).

### Gráficos

`chart-1` … `chart-8` (paleta categórica, ajustada por tema). Convenção: receitas = `chart-1`,
despesas = `chart-5`. Eixos e grades: `var(--chart-axis)` e `var(--chart-grid)`.

### Como usar

```tsx
<span className="text-success">+ R$ 100</span>             // texto
<span className="bg-warning/10 text-warning">Pendente</span> // suave (badge, ícone)
<Button>Salvar</Button>                                    // CTA = primary
<Button variant="destructive">Excluir</Button>             // destrutivo
```

Em componentes, prefira o mapa de tons em vez de escrever classes: `TONE[tone].soft`.

```ts
type Tone = "brand" | "secondary" | "tertiary" | "success" | "warning" | "danger" | "info" | "neutral"
```

---

## 2. Tipografia

Família única: **Outfit** (títulos, corpo e números). `font-display`, `font-body` e `font-sans`
apontam para ela; não introduza outra família.

| Estilo | Classes | Uso |
| --- | --- | --- |
| Título de página | `PageHeader` (`text-2xl sm:text-3xl font-bold`) | Um `h1` por página |
| Título de seção | `SectionCard title` (`text-base font-semibold`) | Cabeçalho de card |
| KPI | `StatCard` (`text-2xl sm:text-[1.75rem] font-bold tabular-nums`) | Valores em destaque |
| Corpo | `text-sm` | Texto padrão de interface |
| Apoio | `text-xs text-muted-foreground` | Dicas, metadados |
| Rótulo (eyebrow) | `eyebrow` | Legenda de KPI, seção curta em CAIXA ALTA |
| Mínimo | `text-2xs` (11px) | Badges. **Nada abaixo disso.** |

Pesos: 400, 500 (`font-medium`), 600 (`font-semibold`), 700 (`font-bold`). Sem 800/900.
Valores monetários sempre com `tabular-nums` (o `<Amount>` já aplica).

---

## 3. Espaçamento, raios e elevação

- Página: `space-y-6 sm:space-y-8`. Grades: `gap-4` (KPIs/cards) e `gap-6` (colunas).
- Padding interno: cards `px-4 sm:px-6`; o layout aplica `p-4 sm:p-6 lg:p-10`.
- Raios (`--radius: 0.75rem`): `rounded-md` controles · `rounded-lg` itens/ícones · `rounded-xl` cards · `rounded-2xl` FAB/hero. Nada de `rounded-[2rem]`.
- Elevação (tokens por tema, aplicados globalmente):
  - `--shadow-card`: todo `Card`. No escuro é mais densa e tem um brilho interno de 1px no topo, para o card não virar só um contorno.
  - `--shadow-card-hover`: cards clicáveis (utilitário `lift`).
  - `--shadow-overlay`: popover, menus, selects, diálogos e sheet.
  - Sem sombras coloridas nem `glass-card`.

---

## 4. Componentes (`@/components/ds`)

| Componente | Para quê |
| --- | --- |
| `PageHeader` | Título, descrição, botão voltar, ações (empilham no mobile) |
| `StatCard` / `StatGrid` | KPI com rótulo, valor, dica, ícone, tom, `loading` e `href` opcional. A grade usa *container queries* (1→2→3/4 colunas pela largura disponível) |
| `SectionCard` | Bloco com cabeçalho padrão; `flush` para tabelas/listas encostadas na borda |
| `MonthStepper` | Navegação ‹ mês ano › com virada de ano (`prefix="Fatura"` no cartão) |
| `Amount` | Valor monetário: `kind="receita" \| "despesa" \| "auto" \| "neutral"` |
| `ToneBadge` | Badge com tom |
| `TransactionStatusBadge` | Status derivado (`deriveStatus`) com rótulo certo para receita/despesa |
| `ProfileBadge` | PF (secundária) / PJ (terciária) |
| `IconTile` | Ícone em bloco suave; aceita `color` livre (conta, cofrinho) |
| `EmptyState` | Ícone + título + descrição + ação |
| `DatePicker` | **Único** campo de data: botão com a data por extenso + calendário (`value`/`onChange` em ISO `YYYY-MM-DD`, `clearable`, `min`/`max`). Nunca use `<Input type="date">` |
| `CountUp` | Número monetário que conta até o valor (usado por `StatCard amount={n}`) |
| `Logo` / `LogoMark` | Marca: monograma "N" cujo último traço vira uma seta de alta (mesmo desenho do favicon e dos ícones do PWA) |

Também compartilhados: `DataTablePagination` / `usePaginatedList`, `CardThumb`
(miniatura do cartão), `TransactionsPage` (receitas e despesas usam o mesmo componente).

Primitivos do shadcn (`src/components/ui`) não são editados. Ajustes globais neles
(alvo de toque, altura máxima de diálogo, botão destrutivo, cabeçalho de tabela)
ficam no fim do `globals.css`.

---

## 5. Motion

Tokens: `--ease-out` (entradas), `--ease-spring` (ícones/feedback), `--ease-in-out`;
`--duration-fast` 150ms · `--duration-base` 250ms · `--duration-slow` 450ms · `--stagger-step` 45ms.

| Efeito | Como |
| --- | --- |
| Entrada de página | `.page-transition` (já no layout) |
| Cascata em grades/listas | utilitário `stagger` no contêiner (`StatGrid` já usa) |
| Card clicável | utilitário `lift` (sobe 2px + sombra; pressiona ao tocar) |
| Feedback de toque | global: botões escalam para 0,97 ao pressionar |
| KPIs | `StatCard amount={n}` conta até o valor |
| Carregamento | `Skeleton` com brilho deslizante (global) |
| Progresso | barras preenchem ao aparecer (global) |
| Elementos que surgem | `animate-pop` |

Regras: entradas ≤ 450ms, nada anima em loop além de carregamento e alerta crítico,
e tudo é desligado por `prefers-reduced-motion` (regra global + `CountUp`).

## 6. Responsivo e mobile

- **Mobile first.** Breakpoints do Tailwind (`sm` 640, `md` 768, `lg` 1024, `xl` 1280).
- **Navegação:** abaixo de `md`, barra inferior (Início, Receitas, **+ Novo**, Despesas, Mais → menu lateral). A partir de `md`, sidebar recolhível.
- **Tabelas:** abaixo de `md`, troque por lista (`<ul className="md:hidden">`) com descrição, valor, status e ações; a tabela fica em `hidden md:block`. Nunca dependa de rolagem horizontal para ver um valor.
- **Toque:** com `pointer: coarse`, botões e itens de menu têm no mínimo 44px (regra global). Use `size="icon-sm"` em ações de linha; não fixe `h-7 w-7`.
- **Inputs:** `text-base md:text-sm` (16px no mobile evita zoom do iOS).
- **Altura:** use `dvh`, nunca `vh`. Diálogos já são limitados a `100dvh - 2rem` com rolagem.
- **Áreas seguras:** utilitários `pt-safe`, `pb-safe` e `pb-bottom-nav`.
- **Hover não é affordance:** só use `cursor-pointer`/hover em algo que de fato navega ou age.

---

## 7. PWA

- Manifest: [`src/app/manifest.ts`](../src/app/manifest.ts) (atalhos para Despesas, Receitas, Cartões).
- Ícones: `public/icons/*` gerados por `python3 scripts/generate-icons.py` (requer Pillow). Favicon: `src/app/icon.svg`.
- Service worker: [`public/sw.js`](../public/sw.js), registrado só em produção. **Não** cacheia `/api`, `/auth` nem dados do Supabase (saldo desatualizado é pior que nenhum); navegações offline caem em `public/offline.html`. Ao mudar a estratégia, incremente `VERSION`.
- `src/proxy.ts` libera `manifest.webmanifest`, `sw.js`, `offline.html` e imagens sem login.

---

## 8. Acessibilidade (checklist)

- Botão só com ícone → `aria-label`.
- Cor nunca é o único sinal: valores levam sinal (+/−) e status leva texto.
- Foco visível (`outline-ring/50` global); não use `outline-none` sem substituto.
- Links externos: `<a target="_blank" rel="noopener noreferrer">`.
- Animações respeitam `prefers-reduced-motion` (regra global).
