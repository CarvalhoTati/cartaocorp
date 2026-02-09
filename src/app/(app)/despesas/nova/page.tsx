import { PageHeader } from '@/components/layout/page-header'
import { ExpenseForm } from '@/components/expenses/expense-form'
import { getCards } from '@/actions/cards'
import { getAreas } from '@/actions/areas'

export default async function NovaDespesaPage() {
  const [cards, areas] = await Promise.all([getCards(), getAreas()])

  return (
    <>
      <PageHeader title="Nova Despesa" description="Registre uma nova despesa" />
      <ExpenseForm cards={cards} areas={areas} />
    </>
  )
}
