# CartaoCorp - Gestao de Cartao Corporativo

Sistema de gestao de cartoes corporativos com controle de saldo por area e centro de custo.

## Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Backend/DB**: Supabase (PostgreSQL + Auth)
- **Charts**: Recharts

## Setup

### 1. Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. No SQL Editor, execute o conteudo de `supabase/migrations/001_initial.sql`
3. Copie a URL e a Anon Key do projeto

### 2. Variaveis de Ambiente

Edite `.env.local` com seus dados do Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3. Instalar e Rodar

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### 4. Primeiro Admin

Apos criar sua conta pelo signup, execute no SQL Editor do Supabase:

```sql
UPDATE profiles SET role = 'admin' WHERE id = 'SEU_USER_ID';
```

## Estrutura do Projeto

```
src/
  app/
    (auth)/        # Login/signup (sem sidebar)
    (app)/         # App principal (com sidebar)
      dashboard/   # KPIs e graficos
      cartoes/     # CRUD de cartoes
      areas/       # CRUD de areas
      depositos/   # Wizard de depositos
      despesas/    # CRUD de despesas com filtros
      relatorios/  # Relatorios e exportacao CSV
  actions/         # Server Actions
  components/      # Componentes React
  lib/             # Utilitarios e clients Supabase
  types/           # Tipos TypeScript
```

## Funcionalidades

- Autenticacao com Supabase Auth
- CRUD de cartoes corporativos
- CRUD de areas/centros de custo
- Wizard de depositos com alocacao por area
- Lancamento de despesas com validacao de saldo em tempo real
- Dashboard com KPIs e graficos
- Relatorios com exportacao CSV
- Controle de permissoes (admin vs usuario)

## Deploy (Vercel)

1. Conecte o repositorio ao Vercel
2. Adicione as variaveis de ambiente
3. Deploy automatico
