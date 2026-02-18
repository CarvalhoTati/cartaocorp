# Runbook - CartaoCorp

## Deploy

### Producao (Vercel)

Deploy automatico via push para branch `main`:

```bash
git push origin main
# Vercel detecta e faz deploy automaticamente
```

### Verificar Deploy

1. Acessar dashboard Vercel
2. Verificar status do ultimo deployment
3. Testar URL de producao

### Variaveis de Ambiente (Vercel)

Configurar em Vercel > Project Settings > Environment Variables:

| Variavel | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key do Supabase |

## Banco de Dados (Supabase)

### Migrations

Migrations em `supabase/migrations/`. Executar manualmente no SQL Editor:

| Migration | Conteudo |
|-----------|----------|
| `001_initial.sql` | Schema completo (tabelas, views, RPC, RLS, triggers) |
| `002_update_deposit.sql` | RPC update_deposit_with_allocations |
| `003_budget_lines.sql` | Tabela budget_lines + view + FK |

**Procedimento:**

1. Acessar Supabase Dashboard > SQL Editor
2. Colar conteudo da migration
3. Executar
4. Verificar resultado (sem erros)
5. Testar operacao afetada na aplicacao

### Criar Usuario

1. Supabase Dashboard > Authentication > Users
2. Clicar "Add User"
3. Preencher email e senha
4. Desmarcar "Confirm email" (se dev/testing)
5. Trigger `handle_new_user` cria perfil automaticamente

### RPC Functions

| Funcao | Uso |
|--------|-----|
| `create_deposit_with_allocations` | Cria deposito + alocacoes atomicamente |
| `update_deposit_with_allocations` | Atualiza deposito + substitui alocacoes |

Ambas validam que soma das alocacoes = valor do deposito.

## Troubleshooting

### Build falha na Vercel

```bash
# Reproduzir localmente
npm run build
```

Erros comuns:
- `useSearchParams` sem `<Suspense>` — envolver componente em Suspense boundary
- `params` nao awaited — usar `await params` em page components (Next.js 15+)
- Tipos incompativeis — verificar `src/types/database.ts` apos migrations

### Erro de autenticacao

1. Verificar variaveis de ambiente na Vercel
2. Confirmar `NEXT_PUBLIC_SUPABASE_URL` e `ANON_KEY`
3. Verificar se usuario existe no Supabase Auth
4. Verificar se perfil foi criado em `profiles` (trigger pode ter falhado)

### Deposito nao salva

1. Verificar se soma das alocacoes = valor do deposito
2. Verificar se areas selecionadas estao ativas
3. Verificar logs no Supabase > Logs (RPC pode retornar erro)
4. RPC usa `SECURITY DEFINER` — verificar se funcao existe

### Despesa rejeitada

1. Verificar saldo disponivel (cartao+area) via `v_area_card_balance`
2. Se tem rubrica, verificar saldo da rubrica via `v_budget_line_balance`
3. Trigger `check_expense_balance` pode bloquear se saldo insuficiente

### Banco nao atualiza

1. Verificar se migration foi executada no SQL Editor
2. Verificar RLS policies (podem bloquear operacoes para usuario nao-admin)
3. Verificar logs no Supabase Dashboard > Logs
4. Triggers em `auth.users` precisam de `SET search_path = public`

## Rollback

### Codigo

```bash
# Identificar commit anterior estavel
git log --oneline -10

# Reverter com novo commit (seguro)
git revert <commit-hash>
git push origin main
```

### Banco

Supabase nao tem rollback automatico. Para reverter migrations:

1. Escrever migration reversa manualmente
2. Executar no SQL Editor
3. Testar aplicacao
4. Cuidado: DROP de tabelas perde dados permanentemente

## Monitoramento

- **Vercel:** Dashboard > Deployments (logs de build e runtime)
- **Supabase:** Dashboard > Logs (queries, auth, edge functions)
- **Supabase:** Dashboard > Database > Replication (monitorar conexoes)
