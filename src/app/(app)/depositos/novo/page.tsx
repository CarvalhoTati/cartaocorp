import { PageHeader } from '@/components/layout/page-header'
import { DepositWizard } from '@/components/deposits/deposit-wizard'
import { getCards } from '@/actions/cards'
import { getAreas } from '@/actions/areas'

export default async function NovoDepositoPage() {
  const [cards, areas] = await Promise.all([getCards(), getAreas()])

  return (
    <>
      <PageHeader
        title="Novo Depósito"
        description="Adicione saldo e distribua entre as áreas"
      />
      <DepositWizard cards={cards} areas={areas} />
    </>
  )
}
