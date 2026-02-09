import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { DepositWizard } from '@/components/deposits/deposit-wizard'
import { getDeposit } from '@/actions/deposits'
import { getCards } from '@/actions/cards'
import { getAreas } from '@/actions/areas'
import { formatCurrency } from '@/lib/utils'

export default async function EditDepositPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let deposit, cards, areas
  try {
    ;[deposit, cards, areas] = await Promise.all([
      getDeposit(id),
      getCards(),
      getAreas(),
    ])
  } catch {
    notFound()
  }

  return (
    <>
      <PageHeader
        title="Editar Depósito"
        description={`${deposit.card?.name} - ${formatCurrency(deposit.amount)}`}
      >
        <Link href="/depositos">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </PageHeader>
      <DepositWizard cards={cards} areas={areas} deposit={deposit} />
    </>
  )
}
