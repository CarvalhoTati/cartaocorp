import { CardForm } from '@/components/cards/card-form'
import { PageHeader } from '@/components/layout/page-header'

export default function NovoCartaoPage() {
  return (
    <>
      <PageHeader title="Novo Cartão" description="Cadastre um novo cartão corporativo" />
      <CardForm />
    </>
  )
}
