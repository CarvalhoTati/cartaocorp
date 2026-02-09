import Link from 'next/link'
import { Receipt, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/layout/empty-state'
import { ExpenseList } from '@/components/expenses/expense-list'
import { ExpenseFilters } from '@/components/expenses/expense-filters'
import { getExpenses } from '@/actions/expenses'
import { getCards } from '@/actions/cards'
import { getAreas } from '@/actions/areas'
import { createClient } from '@/lib/supabase/server'

export default async function DespesasPage({
  searchParams,
}: {
  searchParams: Promise<{ card_id?: string; area_id?: string; month?: string }>
}) {
  const params = await searchParams
  const [expenses, cards, areas, supabase] = await Promise.all([
    getExpenses({
      card_id: params.card_id,
      area_id: params.area_id,
      reference_month: params.month,
    }),
    getCards(),
    getAreas(),
    createClient(),
  ])

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  return (
    <>
      <PageHeader title="Despesas" description="Lançamentos de despesas">
        <Link href="/despesas/nova">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Despesa
          </Button>
        </Link>
      </PageHeader>

      <ExpenseFilters cards={cards} areas={areas} />

      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nenhuma despesa encontrada"
          description="Registre uma despesa ou ajuste os filtros"
        >
          <Link href="/despesas/nova">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Despesa
            </Button>
          </Link>
        </EmptyState>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {expenses.length} despesa{expenses.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseList expenses={expenses} isAdmin={isAdmin} />
          </CardContent>
        </Card>
      )}
    </>
  )
}
