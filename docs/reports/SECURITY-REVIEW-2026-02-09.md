# Security Review - CartaoCorp

**Data:** 2026-02-09
**Stack:** Next.js 16.1.6 + React 19 + Supabase + Zod v4
**Nivel de Risco Geral:** MEDIO

---

## Executive Summary

Auditoria completa de seguranca baseada no OWASP Top 10 (2021) realizada no projeto CartaoCorp. O sistema utiliza Supabase para autenticacao e possui Row Level Security (RLS) implementado, o que reduz significativamente riscos de controle de acesso. No entanto, foram identificadas vulnerabilidades CRITICAS e ALTAS que necessitam correcao imediata.

**Issues Criticas:** 1
**Issues Altas:** 4
**Issues Medias:** 6
**Issues Baixas:** 3

---

## Issues Criticos (Corrigir Imediatamente)

### C01: Open Redirect Vulnerability via `next` Parameter

**Arquivo:** `src/app/auth/callback/route.ts:7-13`
**OWASP:** A01:2021 - Broken Access Control
**Severidade:** CRITICO

```typescript
const next = searchParams.get('next') ?? '/dashboard'
// ...
return NextResponse.redirect(`${origin}${next}`)
```

**Problema:**
O parametro `next` e extraido diretamente da URL sem validacao, permitindo open redirect. Atacante pode enviar link malicioso:
```
https://cartaocorp.com/auth/callback?code=xxx&next=//evil.com
```
Usuario autenticado sera redirecionado para site malicioso com sessao valida.

**Impacto:**
- Phishing attacks
- Session hijacking
- Credential theft

**Remediacao:**
```typescript
const next = searchParams.get('next') ?? '/dashboard'
const allowedPaths = ['/dashboard', '/areas', '/cartoes', '/depositos', '/despesas', '/redefinir-senha']
const safePath = allowedPaths.includes(next) ? next : '/dashboard'
return NextResponse.redirect(`${origin}${safePath}`)
```

---

## Issues Altos (Corrigir Antes de Producao)

### H01: Missing User Isolation in Server Actions (Multi-Tenant Risk)

**Arquivos:** TODOS os arquivos em `src/actions/`
**OWASP:** A01:2021 - Broken Access Control
**Severidade:** ALTO

**Problema:**
Nenhuma das server actions implementa filtro por `user_id` ou `tenant_id`. Embora o RLS do Supabase proteja a camada de banco de dados, as actions nao validam ownership antes de operacoes UPDATE/DELETE, confiando apenas em RLS.

**Arquivos Afetados:**
- `src/actions/areas.ts` (updateArea, toggleAreaActive)
- `src/actions/budget-lines.ts` (updateBudgetLine, deleteBudgetLine)
- `src/actions/cards.ts` (updateCard, toggleCardActive)
- `src/actions/deposits.ts` (updateDepositWithAllocations, deleteDeposit)
- `src/actions/expenses.ts` (deleteExpense)

**Exemplo Vulneravel:**
```typescript
// src/actions/areas.ts:68
export async function updateArea(id: string, formData: AreaFormData) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('areas')
    .update(parsed.data)
    .eq('id', id) // <- SEM user_id filter
```

**Risco:**
Se RLS for desabilitado acidentalmente ou houver bug em policy, usuario pode modificar/deletar recursos de outros usuarios.

**Remediacao:**
Adicionar validacao de ownership explicita:
```typescript
export async function updateArea(id: string, formData: AreaFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nao autenticado' }

  // Verificar ownership ou role admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Sem permissao' }
  }

  const { error } = await supabase
    .from('areas')
    .update(parsed.data)
    .eq('id', id)
  // ...
}
```

### H02: Weak Password Policy

**Arquivo:** `src/app/(auth)/redefinir-senha/page.tsx:26-28`
**OWASP:** A07:2021 - Identification and Authentication Failures
**Severidade:** ALTO

```typescript
if (password.length < 6) {
  setError('A senha deve ter no minimo 6 caracteres')
  return
}
```

**Problema:**
Politica de senha extremamente fraca:
- Minimo de apenas 6 caracteres
- Sem requisitos de complexidade (numeros, maiusculas, simbolos)
- Vulneravel a brute force e dictionary attacks

**Impacto:**
Contas facilmente comprometidas com senhas fracas como "123456", "senha1", etc.

**Remediacao:**
```typescript
const passwordSchema = z.string()
  .min(8, 'Minimo 8 caracteres')
  .regex(/[A-Z]/, 'Pelo menos uma letra maiuscula')
  .regex(/[a-z]/, 'Pelo menos uma letra minuscula')
  .regex(/[0-9]/, 'Pelo menos um numero')
  .regex(/[^A-Za-z0-9]/, 'Pelo menos um caractere especial')

const result = passwordSchema.safeParse(password)
if (!result.success) {
  setError(result.error.issues[0].message)
  return
}
```

### H03: Missing Rate Limiting

**Arquivos:** `src/app/(auth)/login/page.tsx`, `src/app/(auth)/esqueci-senha/page.tsx`
**OWASP:** A07:2021 - Identification and Authentication Failures
**Severidade:** ALTO

**Problema:**
Endpoints de autenticacao nao implementam rate limiting em nivel de aplicacao. Embora Supabase tenha rate limiting proprio, e boa pratica ter protecao adicional.

**Rotas Vulneraveis:**
- Login: `src/app/(auth)/login/page.tsx:30`
- Password reset: `src/app/(auth)/esqueci-senha/page.tsx:24`

**Impacto:**
- Brute force attacks em credenciais
- Account enumeration via password reset
- DoS em endpoints de autenticacao

**Remediacao:**
Implementar rate limiting com Redis ou Upstash:
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { kv } from '@vercel/kv'

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 tentativas por 15 min
})

async function handleLogin(e: React.FormEvent) {
  const identifier = email || request.ip
  const { success } = await ratelimit.limit(identifier)
  if (!success) {
    setError('Muitas tentativas. Tente novamente em 15 minutos.')
    return
  }
  // ... resto do codigo
}
```

### H04: Missing Security Headers

**Arquivo:** `next.config.ts`
**OWASP:** A05:2021 - Security Misconfiguration
**Severidade:** ALTO

**Problema:**
Next.js config nao define security headers essenciais:
- Content-Security-Policy (CSP)
- X-Frame-Options (clickjacking protection)
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy

**Remediacao:**
```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://wzyxromjnhmzkitjzyzn.supabase.co",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}
```

---

## Issues Medios

### M01: Client-Side Authentication Check Bypass

**Arquivo:** `src/lib/supabase/middleware.ts:36-47`
**OWASP:** A01:2021 - Broken Access Control
**Severidade:** MEDIO

**Problema:**
Middleware apenas redireciona usuarios nao-autenticados, mas nao retorna 401/403. Server actions confiam em `getUser()` mas nao sempre validam resultado.

**Exemplo:**
```typescript
const { data: { user } } = await supabase.auth.getUser()
// Alguns actions procedem sem verificar if (!user)
```

**Remediacao:**
Criar helper padrao:
```typescript
async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nao autenticado')
  return user
}

// Usar em todas as actions
export async function createArea(formData: AreaFormData) {
  const user = await requireAuth()
  // ...
}
```

### M02: Information Disclosure via Error Messages

**Arquivo:** `src/app/(auth)/login/page.tsx:36`
**OWASP:** A05:2021 - Security Misconfiguration
**Severidade:** MEDIO

```typescript
if (error) {
  setError('Email ou senha invalidos')
  setLoading(false)
  return
}
```

**Problema:**
Mensagem de erro generica e boa pratica, MAS alguns endpoints expoe erros detalhados do Supabase:

```typescript
// src/actions/areas.ts:14
if (error) throw new Error(error.message) // <- Vaza detalhes do DB
```

**Impacto:**
Erros de banco de dados podem revelar:
- Estrutura de tabelas
- Nomes de colunas
- Detalhes de implementacao

**Remediacao:**
```typescript
if (error) {
  console.error('Database error:', error.message) // Log completo
  throw new Error('Erro ao processar solicitacao') // Mensagem generica
}
```

### M03: Missing CSRF Protection on State-Changing Actions

**Arquivos:** Todos os server actions em `src/actions/`
**OWASP:** A01:2021 - Broken Access Control
**Severidade:** MEDIO

**Problema:**
Next.js Server Actions sao protegidas por tokens CSRF automaticamente quando chamadas de componentes, MAS se API routes forem adicionadas futuramente sem protecao, vulnerabilidade sera introduzida.

**Remediacao Preventiva:**
Documentar que todas as novas API routes devem:
1. Usar Server Actions quando possivel
2. Se usar API routes, validar `origin` header
3. Implementar double-submit cookie pattern se necessario

### M04: Insufficient Logging of Security Events

**Arquivos:** Todos os arquivos de autenticacao
**OWASP:** A09:2021 - Security Logging and Monitoring Failures
**Severidade:** MEDIO

**Problema:**
Eventos de seguranca nao sao logados:
- Tentativas de login falhadas
- Mudancas de senha
- Operacoes privilegiadas (delete, update de recursos criticos)
- Acesso negado

**Remediacao:**
Implementar logging centralizado:
```typescript
// lib/audit-log.ts
export async function logSecurityEvent(event: {
  type: 'login_failed' | 'password_reset' | 'unauthorized_access' | 'resource_deleted'
  user_id?: string
  ip?: string
  details?: Record<string, unknown>
}) {
  const supabase = await createClient()
  await supabase.from('audit_logs').insert({
    event_type: event.type,
    user_id: event.user_id,
    ip_address: event.ip,
    details: event.details,
    timestamp: new Date().toISOString()
  })
}

// Usar em login:
if (error) {
  await logSecurityEvent({
    type: 'login_failed',
    ip: request.headers.get('x-forwarded-for'),
    details: { email }
  })
  setError('Email ou senha invalidos')
}
```

### M05: No Input Sanitization for XSS (Client-Side)

**Arquivos:** Componentes que renderizam user input
**OWASP:** A03:2021 - Injection
**Severidade:** MEDIO

**Problema:**
React sanitiza automaticamente valores em `{variable}`, MAS se houver uso de `dangerouslySetInnerHTML` ou construcao dinamica de HTML, XSS e possivel.

**Verificacao Necessaria:**
Buscar por:
- `dangerouslySetInnerHTML`
- `innerHTML`
- Construcao de atributos HTML dinamicos

**Resultado da busca:** Nenhum encontrado (BOM)

**Recomendacao:**
Adicionar hook ESLint para prevenir introducao futura:
```json
// .eslintrc.json
{
  "rules": {
    "react/no-danger": "error"
  }
}
```

### M06: Exposed Supabase Anon Key in Repository

**Arquivo:** `.env.local:2`
**OWASP:** A02:2021 - Cryptographic Failures
**Severidade:** MEDIO (mas aceitavel para Supabase anon key)

```
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_nJJIzMkyFc4U7taOuwfYUA_xhx6BKVx
```

**Analise:**
A Supabase anon key e PUBLICA por design e protegida por RLS. No entanto:
- Service role key NUNCA deve estar exposta
- `.env.local` deve estar em `.gitignore`

**Verificacao:**
```bash
# Confirmar que .env.local esta em .gitignore
grep ".env.local" .gitignore
```

**Acao:**
Se `.env.local` foi commitado, rotacionar chave imediatamente.

---

## Issues Baixos

### L01: Missing Email Verification Flow

**Arquivo:** Auth flow geral
**OWASP:** A07:2021 - Identification and Authentication Failures
**Severidade:** BAIXO

**Observacao:**
Signup esta desabilitado (apenas admin cria contas via Supabase panel), mas se habilitado futuramente, deve ter:
- Verificacao de email obrigatoria
- Rate limiting em signup
- CAPTCHA para prevenir bots

### L02: No Account Lockout Policy

**Arquivo:** Login flow
**OWASP:** A07:2021 - Identification and Authentication Failures
**Severidade:** BAIXO

**Problema:**
Nenhum mecanismo de lockout apos N tentativas falhadas.

**Remediacao:**
Implementar junto com rate limiting (H03).

### L03: Missing Content-Type Validation

**Arquivos:** Server actions que aceitam JSONB
**OWASP:** A03:2021 - Injection
**Severidade:** BAIXO

**Problema:**
Actions que aceitam objetos JSONB (deposits.ts:29, 61) nao validam estrutura com Zod.

**Exemplo:**
```typescript
allocations: { area_id: string; amount: number }[]
```

**Remediacao:**
```typescript
const allocationSchema = z.object({
  area_id: z.string().uuid(),
  amount: z.number().positive()
})

const inputSchema = z.object({
  // ...
  allocations: z.array(allocationSchema)
})

const parsed = inputSchema.safeParse(input)
if (!parsed.success) return { error: parsed.error.issues[0].message }
```

---

## Pontos Positivos (Security Best Practices Implementadas)

### Arquitetura de Seguranca

1. **Row Level Security (RLS) Implementado**
   - Todas as tabelas tem RLS habilitado
   - Policies baseadas em role (admin/user)
   - SECURITY DEFINER com search_path seguro em functions

2. **Validacao de Input com Zod**
   - Schemas definidos para areas, cards, expenses
   - Client-side e server-side validation

3. **Supabase Auth (Managed)**
   - Bcrypt para password hashing (gerenciado por Supabase)
   - Refresh token rotation automatico
   - Secure cookie handling via @supabase/ssr

4. **Parametrized Queries**
   - Todas as queries Supabase usam query builder (nao SQL raw)
   - Zero risco de SQL injection

5. **HTTPS-Only Cookies**
   - Supabase SSR configura cookies com secure, httpOnly, sameSite

6. **Business Logic Constraints**
   - Trigger `check_expense_balance` previne overspending
   - Atomic transactions em `create_deposit_with_allocations`

---

## OWASP Top 10 Compliance Matrix

| # | Categoria | Status | Issues |
|---|-----------|--------|--------|
| A01 | Broken Access Control | PARCIAL | C01, H01, M01 |
| A02 | Cryptographic Failures | CONFORME | M06 (minor) |
| A03 | Injection | CONFORME | L03 (minor), M05 (preventivo) |
| A04 | Insecure Design | CONFORME | - |
| A05 | Security Misconfiguration | NAO CONFORME | H04, M02 |
| A06 | Vulnerable Components | NAO AVALIADO | Requer npm audit |
| A07 | Authentication Failures | NAO CONFORME | H02, H03, L01, L02 |
| A08 | Software/Data Integrity | CONFORME | - |
| A09 | Logging Failures | NAO CONFORME | M04 |
| A10 | SSRF | CONFORME | - |

---

## Verificacoes Adicionais Necessarias

### Comandos de Verificacao

```bash
# 1. Verificar dependencias vulneraveis
cd /c/Users/DENTAL/cartaocorp
npm audit --audit-level=high

# 2. Verificar se .env.local esta em .gitignore
grep ".env.local" .gitignore

# 3. Verificar se .env.local foi commitado no historico
git log --all --full-history -- .env.local

# 4. Verificar uso de dangerouslySetInnerHTML
grep -r "dangerouslySetInnerHTML" src/

# 5. Verificar uso de eval (inseguro)
grep -r "eval(" src/
```

---

## Recomendacoes Priorizadas

### Imediato (Esta Semana)
1. **C01** - Corrigir open redirect em auth callback
2. **H04** - Adicionar security headers em next.config.ts
3. **H02** - Fortalecer politica de senha

### Curto Prazo (Ate 2 Semanas)
4. **H01** - Adicionar validacao de ownership em server actions
5. **H03** - Implementar rate limiting
6. **M04** - Implementar audit logging

### Medio Prazo (Ate 1 Mes)
7. **M01-M03** - Melhorias em error handling e CSRF docs
8. **L01-L03** - Features de seguranca adicionais

---

## Conclusao

O projeto CartaoCorp possui uma base de seguranca solida com RLS e Supabase Auth, mas requer correcoes criticas antes de producao. O uso de Supabase reduz significativamente a superficie de ataque, mas a camada de aplicacao ainda possui gaps que devem ser endereçados.

**Nivel de Risco Atual:** MEDIO
**Nivel de Risco Apos Correcoes:** BAIXO

**Proximo Passo:** Corrigir issues CRITICOS e ALTOS antes de qualquer deploy em producao.

---

**Auditoria realizada por:** Claude Opus 4.6 (Security Reviewer Agent)
**Metodologia:** OWASP Top 10 (2021) + SANS Top 25 + CWE Analysis
**Data:** 2026-02-09
