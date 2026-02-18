# CartaoCorp - Documentacao

Sistema de gestao de cartoes corporativos com controle de areas (centros de custo), depositos, despesas e relatorios financeiros.

## Stack

- **Frontend:** Next.js 16.1.6 + React 19 + TypeScript 5
- **Estilo:** Tailwind v4 + shadcn/ui + Lucide icons
- **Backend:** Supabase (Auth + Database + RLS + RPC)
- **Graficos:** Recharts
- **Validacao:** Zod v4 + React Hook Form
- **Deploy:** Vercel (auto-deploy on push to main)

## Modulos

| Modulo | Rota | Funcionalidade |
|--------|------|----------------|
| Dashboard | `/dashboard` | KPIs, grafico por area, despesas recentes |
| Cartoes | `/cartoes` | CRUD de cartoes corporativos |
| Areas | `/areas` | CRUD de centros de custo + rubricas |
| Depositos | `/depositos` | Depositos em cartoes com alocacao por area |
| Despesas | `/despesas` | Registro de despesas com verificacao de saldo |
| Relatorios | `/relatorios` | Relatorios por area/cartao/mes + export CSV |

## Indice

| Pasta | Conteudo |
|-------|----------|
| [features/](./features/) | Features implementadas |
| [planning/](./planning/) | Specs e planejamento |
| [reports/](./reports/) | Auditorias e analises |
| [project-info/](./project-info/) | Schemas, arquitetura, contexto |
| [handoff/](./handoff/) | Contexto entre sessoes |
| [temp/](./temp/) | Arquivos temporarios |
| [old/](./old/) | Documentos obsoletos |

## Docs Principais

- [CONTRIBUTING.md](./CONTRIBUTING.md) - Como contribuir e rodar o projeto
- [RUNBOOK.md](./RUNBOOK.md) - Operacoes, deploy e troubleshooting
