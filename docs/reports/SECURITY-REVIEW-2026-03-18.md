# Security Review - CartaoCorp

**Data:** 2026-03-18
**Revisor:** Security Reviewer Agent
**Stack:** Next.js 16.1.6 + React 19 + Supabase + Tailwind v4 + shadcn/ui
**Nivel de Risco Geral:** MEDIO

---

## Resumo Executivo

O projeto CartaoCorp apresenta uma postura de seguranca razoavel para uma aplicacao interna corporativa. A autenticacao via Supabase Auth, validacao com Zod nos server actions, e RLS no banco de dados estao implementados. No entanto, foram identificadas vulnerabilidades que devem ser corrigidas antes de considerar a aplicacao production-ready para um ambiente mais amplo.

**Estatisticas:**
- CRITICAL: 1
- HIGH: 4
- MEDIUM: 5
- LOW: 3
- INFO: 2

---

## Issues Criticos (Corrigir Imediatamente)

### [C01] Open Redirect no Auth Callback
**Severidade:** CRITICAL
**OWASP:** A01:2021 - Broken Access Control
**Arquivo:** `src/app/auth/callback/route.ts` @ linhas 7, 13

```typescript
const next = searchParams.get('next') ?? '/dashboard'
// ...
return NextResponse.redirect(`${origin}${next}`)
```

**Problema:** O parametro `next` vem diretamente da query string sem nenhuma validacao. Um atacante pode construir uma URL como:
```
/auth/callback?code=VALID_CODE&next=https://evil.com
```
Embora o `origin` seja prepended, um path como `//evil.com` ou `/..//evil.com` pode ser explorado dependendo do browser. Alem disso, o `next` pode redirecionar para rotas internas nao autorizadas.

**Remediacao:**
```typescript
const next = searchParams.get('next') ?? '/dashboard'
const allowedPaths = ['/dashboard', '/redefinir-senha', '/cartoes', '/areas', '/despesas', '/depositos', '/relatorios']
const safePath = allowedPaths.some(p => next.startsWith(p)) ? next : '/dashboard'
return NextResponse.redirect(`${origin}${safePath}`)
```

---

## Issues Altos (Corrigir Antes de Producao)

### [H01] Ausencia de Verificacao de Autorizacao em Server Actions de Leitura
**Severidade:** HIGH
**OWASP:** A01:2021 - Broken Access Control
**Arquivos:** `src/actions/cards.ts`, `src/actions/areas.ts`, `src/actions/deposits.ts`, `src/actions/reports.ts`, `src/actions/budget-lines.ts`

**Problema:** As funcoes de leitura (getCards, getAreas, getDeposits, getReportByArea, etc.) nao verificam `supabase.auth.getUser()` no server action. Dependem exclusivamente do middleware e do RLS. Embora o RLS proteja no banco, se um atacante conseguir chamar o server action diretamente com um token expirado ou invalido, a unica protecao e o RLS do Supabase (que valida o JWT do cookie). A defesa em profundidade requer verificacao explicita no server action tambem.

**Remediacao:** Adicionar verificacao `getUser()` em todos os server actions:
```typescript
export async function getCards() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nao autenticado')
  // ... rest
}
```

### [H02] Ausencia de Verificacao de Role Admin em Operacoes de Escrita (Server Actions)
**Severidade:** HIGH
**OWASP:** A01:2021 - Broken Access Control
**Arquivos:**
- `src/actions/cards.ts` @ linhas 52, 69, 125 (createCard, updateCard, toggleCardActive)
- `src/actions/areas.ts` @ linhas 94, 111, 130 (createArea, updateArea, toggleAreaActive)
- `src/actions/budget-lines.ts` @ linhas 78, 96, 115 (createBudgetLine, updateBudgetLine, deleteBudgetLine)
- `src/actions/expenses.ts` @ linha 71 (deleteExpense)

**Problema:** Os server actions de escrita nao verificam se o usuario tem role `admin` antes de executar. A verificacao depende inteiramente do RLS no Supabase. Se o RLS falhar ou for mal configurado, qualquer usuario autenticado pode criar/editar/deletar registros. `createExpense` e `updateExpense` verificam `getUser()` mas nao verificam o role. `deleteExpense` nao verifica nem autenticacao nem role.

**Nota:** O RLS esta configurado corretamente no banco (INSERT/UPDATE/DELETE requerem `role = 'admin'` na maioria das tabelas), mas a defesa em profundidade e essencial. A `deleteExpense` e especialmente preocupante pois nao tem NENHUMA verificacao no server action -- a unica protecao e o RLS.

**Remediacao:** Adicionar verificacao de role em server actions de escrita:
```typescript
export async function deleteExpense(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nao autenticado' }
  // Para operacoes que requerem admin no RLS:
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Sem permissao' }
  // ... delete
}
```

### [H03] Ausencia Total de Security Headers
**Severidade:** HIGH
**OWASP:** A05:2021 - Security Misconfiguration
**Arquivo:** `next.config.ts` @ linhas 1-7

**Problema:** O `next.config.ts` esta completamente vazio -- nao configura nenhum header de seguranca. Faltam:
- `Content-Security-Policy` (CSP)
- `X-Frame-Options` (protecao contra clickjacking)
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`
- `Strict-Transport-Security` (HSTS)

**Remediacao:**
```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://wzyxromjnhmzkitjzyzn.supabase.co; frame-ancestors 'none';"
          },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
}
```

### [H04] Ausencia de Rate Limiting nas API Routes e Server Actions
**Severidade:** HIGH
**OWASP:** A04:2021 - Insecure Design
**Arquivos:** Todos os arquivos em `src/actions/` e `src/app/api/keep-alive/route.ts`

**Problema:** Nao existe nenhum rate limiting na camada de aplicacao. O Supabase Auth tem rate limiting proprio (configurado em `config.toml` para login), mas:
- Os server actions de CRUD nao tem rate limiting
- A rota `/api/keep-alive` e publica e sem rate limiting
- Um atacante pode fazer brute-force de IDs em `deleteExpense`, `getExpense`, etc.

**Remediacao:** Implementar rate limiting com `next-rate-limit` ou similar, ou usar Vercel's built-in Edge rate limiting.

---

## Issues Medios

### [M01] Rota /api/keep-alive Publica sem Autenticacao
**Severidade:** MEDIUM
**OWASP:** A01:2021 - Broken Access Control
**Arquivo:** `src/app/api/keep-alive/route.ts` @ linhas 1-17

**Problema:** A rota `/api/keep-alive` usa `createClient` com a anon key (nao com sessao de usuario) e faz uma query ao banco. Embora inofensiva, esta exposta publicamente e pode ser usada para:
- Abuso de recursos (spam de requests)
- Fingerprinting (confirma que Supabase esta em uso)
- Expoe erro de DB com `error.message` no response

**Remediacao:** Adicionar um token secreto (ex: `CRON_SECRET`) e validar no header:
```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ...
}
```

### [M02] Politica RLS Excessivamente Permissiva em Allocations
**Severidade:** MEDIUM
**OWASP:** A01:2021 - Broken Access Control
**Arquivo:** `supabase/migrations/007_fix_rpc_security.sql` @ linhas 136-137

```sql
CREATE POLICY "Users can update allocations" ON public.allocations
  FOR UPDATE USING (true) WITH CHECK (true);
```

**Problema:** Qualquer usuario autenticado pode atualizar qualquer allocation. Isso contradiz o padrao de admin-only usado nas demais tabelas.

**Remediacao:** Restringir a admin:
```sql
CREATE POLICY "Users can update allocations" ON public.allocations
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

### [M03] Senha Minima de 6 Caracteres e Sem Requisitos de Complexidade
**Severidade:** MEDIUM
**OWASP:** A07:2021 - Identification and Authentication Failures
**Arquivos:**
- `supabase/config.toml` @ linha 175: `minimum_password_length = 6`
- `supabase/config.toml` @ linha 178: `password_requirements = ""`
- `src/app/(auth)/redefinir-senha/page.tsx` @ linha 26: `password.length < 6`

**Problema:** Senhas de 6 caracteres sao fracas. Nao ha requisito de complexidade (letras + numeros + simbolos). Considerando que as contas reais usam senhas numericas curtas ([VER SUPABASE DASHBOARD]), a politica de senha e muito fraca.

**Remediacao:**
- Aumentar `minimum_password_length` para 8+
- Definir `password_requirements = "lower_upper_letters_digits"`
- Atualizar validacao no frontend para refletir

### [M04] Supabase Signup Habilitado na Configuracao Local
**Severidade:** MEDIUM
**OWASP:** A07:2021 - Identification and Authentication Failures
**Arquivo:** `supabase/config.toml` @ linhas 169, 204

```toml
enable_signup = true          # linha 169
enable_signup = true          # linha 204 (email)
```

**Problema:** Embora a memoria do projeto diga "Signup removido", a configuracao local do Supabase permite signup. Se aplicada ao ambiente de producao, qualquer pessoa poderia criar uma conta. A configuracao de producao no Supabase Dashboard e separada, mas isso pode causar confusao.

**Remediacao:** Definir `enable_signup = false` em `config.toml` para consistencia. Confirmar que esta desabilitado no Supabase Dashboard de producao.

### [M05] Erro de Supabase Exposto ao Usuario
**Severidade:** MEDIUM
**OWASP:** A09:2021 - Security Logging and Monitoring Failures
**Arquivos:**
- `src/actions/expenses.ts` @ linha 62: `return { error: error.message }`
- `src/actions/cards.ts` @ linha 63: `return { error: error.message }`
- `src/actions/areas.ts` @ linha 105: `return { error: error.message }`
- `src/actions/deposits.ts` @ linha 52: `return { error: error.message }`
- `src/app/api/keep-alive/route.ts` @ linha 13: `message: error.message`
- Multiplos `throw new Error(error.message)` em actions de leitura

**Problema:** Mensagens de erro do Supabase/PostgreSQL sao retornadas diretamente ao cliente. Podem vazar nomes de tabelas, colunas, constraints, e detalhes de schema.

**Remediacao:** Logar o erro completo no servidor, retornar mensagem generica ao cliente:
```typescript
if (error) {
  console.error('createExpense error:', error)
  return { error: 'Erro ao criar despesa. Tente novamente.' }
}
```

---

## Issues Baixos

### [L01] Parametro `id` em Server Actions Nao Validado como UUID
**Severidade:** LOW
**Arquivo:** `src/actions/expenses.ts` @ linhas 71, 87, 111 (deleteExpense, getExpense, updateExpense)
**Arquivo:** `src/actions/cards.ts` @ linhas 18, 69, 88, 99, 125
**Arquivo:** `src/actions/areas.ts` @ linhas 18, 111, 130

**Problema:** Os parametros `id` recebidos por server actions nao sao validados como UUID. Um atacante poderia enviar strings arbitrarias que chegariam ao banco.

**Remediacao:** Validar com Zod antes de usar:
```typescript
const uuidSchema = z.string().uuid()
const parsed = uuidSchema.safeParse(id)
if (!parsed.success) return { error: 'ID invalido' }
```

### [L02] Input `createDepositWithAllocations` Sem Validacao Zod
**Severidade:** LOW
**Arquivo:** `src/actions/deposits.ts` @ linhas 29-59

**Problema:** A funcao `createDepositWithAllocations` recebe um objeto complexo com `card_id`, `amount`, `allocations[]`, etc., mas nao usa Zod para validar a estrutura. Apenas valida a soma das alocacoes. Os campos individuais (card_id como UUID, amount positivo, etc.) nao sao validados no server action.

**Remediacao:** Criar um schema Zod para a entrada completa do deposito e validar.

### [L03] Ausencia de Confirmacao de Email
**Severidade:** LOW
**OWASP:** A07:2021 - Identification and Authentication Failures
**Arquivo:** `supabase/config.toml` @ linha 209

```toml
enable_confirmations = false
```

**Problema:** Confirmacao de email desabilitada. Aceitavel para app interno com contas criadas manualmente, mas mencionado para completude.

---

## Informativo

### [I01] Supabase Anon Key no Arquivo de Report
**Severidade:** INFO
**Arquivo:** `docs/reports/SECURITY-REVIEW-2026-02-09.md` @ linha 416

A anon key do Supabase esta visivel no report anterior. A anon key e publica por design e protegida por RLS, portanto nao e um vazamento. Apenas informativo.

### [I02] Ausencia de Testes de Seguranca
**Severidade:** INFO

Nao foram encontrados testes automatizados (unit ou integration) que validem:
- Que usuarios nao-admin sao rejeitados em operacoes de escrita
- Que rotas protegidas redirecionam para login
- Que o RLS funciona conforme esperado

---

## Checklist OWASP Top 10

| # | Categoria | Status | Notas |
|---|-----------|--------|-------|
| 1 | Injection | OK | Supabase client usa queries parametrizadas. Sem raw SQL no app. |
| 2 | Auth Quebrada | PARCIAL | Auth via Supabase OK. Senha fraca (M03). Sem MFA. |
| 3 | Dados Sensiveis | OK | Secrets em .env.local, .gitignore correto. Sem service key exposta. |
| 4 | XXE | N/A | Sem parsing de XML. |
| 5 | Controle de Acesso | FALHA | Open redirect (C01), falta authz em server actions (H01, H02), RLS permissivo (M02). |
| 6 | Misconfiguration | FALHA | Sem security headers (H03), signup habilitado (M04). |
| 7 | XSS | OK | Sem dangerouslySetInnerHTML. React escapa output por padrao. |
| 8 | Desserializacao | OK | Sem desserializacao insegura. |
| 9 | Componentes Vulneraveis | A VERIFICAR | Executar `npm audit` para verificar dependencias. |
| 10 | Logging Insuficiente | FALHA | Sem logging de eventos de seguranca, erros do DB expostos (M05). |

## Checklist Final

- [x] Sem secrets hardcoded no codigo-fonte
- [x] .env.local em .gitignore
- [x] Inputs validados com Zod (parcial - deposits faltam)
- [x] Queries parametrizadas (via Supabase client)
- [x] Output escapado (React default)
- [ ] Auth/authz verificados em todos os server actions
- [ ] Rate limiting
- [ ] Security headers configurados
- [ ] Dependencias auditadas (npm audit)
- [ ] Logging de eventos de seguranca

## Proximos Passos (Prioridade)

1. **IMEDIATO:** Corrigir open redirect no auth callback (C01)
2. **URGENTE:** Adicionar security headers no next.config.ts (H03)
3. **URGENTE:** Adicionar verificacao de auth/role nos server actions (H01, H02)
4. **IMPORTANTE:** Corrigir RLS permissivo em allocations (M02)
5. **IMPORTANTE:** Proteger rota /api/keep-alive com token (M01)
6. **RECOMENDADO:** Fortalecer politica de senha (M03)
7. **RECOMENDADO:** Sanitizar mensagens de erro (M05)
8. **RECOMENDADO:** Executar `npm audit` e corrigir vulnerabilidades
9. **RECOMENDADO:** Adicionar testes de seguranca automatizados
