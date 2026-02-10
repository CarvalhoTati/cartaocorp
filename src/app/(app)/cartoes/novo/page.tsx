import { CardForm } from '@/components/cards/card-form'
import { PageHeader } from '@/components/layout/page-header'
import { getAreas } from '@/actions/areas'

export default async function NovoCartaoPage() {
  const areas = await getAreas()

  return (
    <>
      <PageHeader title="Novo Cartão" description="Cadastre um novo cartão corporativo" />
      <CardForm areas={areas} />
    </>
  )
}
