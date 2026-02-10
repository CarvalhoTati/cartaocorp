import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { ExpenseForm } from '@/components/expenses/expense-form'
import { getExpense } from '@/actions/expenses'
import { getCards } from '@/actions/cards'
import { getAreas } from '@/actions/areas'

export default async function EditarDespesaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [expense, cards, areas] = await Promise.all([
    getExpense(id),
    getCards(),
    getAreas(),
  ])

  if (!expense) notFound()

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/despesas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader title="Editar Despesa" description="Altere os dados da despesa" />
      </div>
      <ExpenseForm cards={cards} areas={areas} expense={expense} />
    </>
  )
}
