# Como Contribuir - CartaoCorp

## Pre-requisitos

- Node.js 18+
- npm
- Conta no Supabase (projeto configurado)
- Conta na Vercel (para deploy)

## Setup Local

```bash
# Clonar repositorio
git clone <repo-url>
cd cartaocorp

# Instalar dependencias
npm install

# Configurar variaveis de ambiente
# Criar .env.local manualmente (nao ha .env.example)
```

## Variaveis de Ambiente

Criar arquivo `.env.local` na raiz com:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-anon-key>
```

Obter valores em: Supabase Dashboard > Settings > API

## Scripts Disponiveis

| Comando | Descricao |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (porta 3000) |
| `npm run build` | Build de producao |
| `npm start` | Iniciar servidor de producao |
| `npm run lint` | Executar ESLint |

## Workflow de Desenvolvimento

1. Criar branch a partir de `main`
2. Implementar mudancas
3. Verificar build: `npm run build`
4. Commit seguindo conventional commits (`feat:`, `fix:`, `refactor:`, etc.)
5. Push e criar PR

## Estrutura do Projeto

```
src/
├── actions/           # Server actions (6 modulos)
│   ├── areas.ts       # CRUD areas + balances
│   ├── budget-lines.ts# CRUD rubricas
│   ├── cards.ts       # CRUD cartoes + balances
│   ├── deposits.ts    # CRUD depositos + alocacoes (via RPC)
│   ├── expenses.ts    # CRUD despesas + verificacao saldo
│   └── reports.ts     # Relatorios agregados
├── app/
│   ├── (auth)/        # Login, esqueci-senha, redefinir-senha
│   ├── (app)/         # App principal (requer autenticacao)
│   │   ├── dashboard/ # KPIs, graficos, despesas recentes
│   │   ├── areas/     # Areas + rubricas (budget lines)
│   │   ├── cartoes/   # Cartoes corporativos
│   │   ├── depositos/ # Depositos com wizard de alocacao
│   │   ├── despesas/  # Despesas com filtros
│   │   └── relatorios/# Relatorios + CSV export
│   └── auth/callback/ # OAuth callback
├── components/
│   ├── ui/            # shadcn/ui (15 componentes base)
│   ├── layout/        # Sidebar, header, mobile-nav, etc.
│   ├── dashboard/     # KPI cards, chart, recent expenses, CSV
│   ├── areas/         # area-form
│   ├── budget-lines/  # budget-line-form, actions
│   ├── cards/         # card-form
│   ├── deposits/      # deposit-wizard, actions
│   └── expenses/      # expense-form, list, filters
├── lib/
│   ├── supabase/      # client.ts, server.ts, middleware.ts
│   ├── utils.ts       # cn, formatCurrency, formatDate, formatMonth
│   └── validations.ts # Schemas Zod (card, area, deposit, expense, etc.)
├── middleware.ts       # Auth middleware (protege rotas /app)
└── types/
    └── database.ts    # Tipos TS (tables, views, enums)
```

## Banco de Dados

### Tabelas

| Tabela | Descricao |
|--------|-----------|
| profiles | Perfis de usuario (FK auth.users) |
| cards | Cartoes corporativos |
| areas | Centros de custo |
| deposits | Depositos em cartoes |
| allocations | Alocacao de deposito por area |
| budget_lines | Rubricas (planejamento orcamentario) |
| expenses | Despesas registradas |

### Views

| View | Descricao |
|------|-----------|
| v_card_balance | Saldo por cartao (depositos - despesas) |
| v_area_balance | Saldo por area (alocado - gasto) |
| v_area_card_balance | Saldo por area+cartao |
| v_monthly_summary | Resumo mensal por cartao+area |
| v_budget_line_balance | Saldo por rubrica (planejado - gasto) |

### Migrations

Executar manualmente no Supabase SQL Editor:

1. `001_initial.sql` — Schema base (tabelas, views, RPC, RLS, triggers)
2. `002_update_deposit.sql` — Funcao update_deposit_with_allocations
3. `003_budget_lines.sql` — Tabela budget_lines + view + FK em expenses

## Contas de Usuario

Contas sao criadas exclusivamente pelo painel do Supabase (Auth > Users).
Nao ha tela de cadastro publico. Trigger `handle_new_user` cria perfil automaticamente.
