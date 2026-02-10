import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { BudgetLineForm } from '@/components/budget-lines/budget-line-form'
import { getArea, getAreaCardBalances } from '@/actions/areas'
import { getBudgetLine, getBudgetLinesTotalPlanned, getDistinctBudgetLineNames } from '@/actions/budget-lines'

export default async function EditarRubricaPage({
  params,
}: {
  params: Promise<{ id: string; lineId: string }>
}) {
  const { id, lineId } = await params

  let area
  let budgetLine
  try {
    ;[area, budgetLine] = await Promise.all([getArea(id), getBudgetLine(lineId)])
  } catch {
    notFound()
  }

  const [cardBalances, alreadyPlanned, existingNames] = await Promise.all([
    getAreaCardBalances(id),
    getBudgetLinesTotalPlanned(id, lineId),
    getDistinctBudgetLineNames(),
  ])
  const totalAllocated = cardBalances.reduce((sum: number, cb: any) => sum + Number(cb.allocated), 0)

  return (
    <>
      <PageHeader
        title="Editar Rubrica"
        description={`${budgetLine.name} — ${area.name}`}
      >
        <Link href={`/areas/${id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </PageHeader>
      <BudgetLineForm
        areaId={id}
        budgetLine={budgetLine}
        totalAllocated={totalAllocated}
        alreadyPlanned={alreadyPlanned}
        existingNames={existingNames}
      />
    </>
  )
}
