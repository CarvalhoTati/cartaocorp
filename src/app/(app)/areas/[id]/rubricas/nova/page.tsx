import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { BudgetLineForm } from '@/components/budget-lines/budget-line-form'
import { getArea, getAreaCardBalances } from '@/actions/areas'
import { getBudgetLinesTotalPlanned, getDistinctBudgetLineNames } from '@/actions/budget-lines'

export default async function NovaRubricaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let area
  try {
    area = await getArea(id)
  } catch {
    notFound()
  }

  const [cardBalances, alreadyPlanned, existingNames] = await Promise.all([
    getAreaCardBalances(id),
    getBudgetLinesTotalPlanned(id),
    getDistinctBudgetLineNames(),
  ])
  const totalAllocated = cardBalances.reduce((sum: number, cb: any) => sum + Number(cb.allocated), 0)

  return (
    <>
      <PageHeader
        title="Nova Rubrica"
        description={`Criar rubrica para ${area.name}`}
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
        totalAllocated={totalAllocated}
        alreadyPlanned={alreadyPlanned}
        existingNames={existingNames}
      />
    </>
  )
}
