import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { CardForm } from '@/components/cards/card-form'
import { getCard } from '@/actions/cards'

export default async function EditCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let card
  try {
    card = await getCard(id)
  } catch {
    notFound()
  }

  return (
    <>
      <PageHeader title="Editar Cartão" description={`${card.name} • ${card.bank}`}>
        <Link href={`/cartoes/${id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </PageHeader>
      <CardForm card={card} />
    </>
  )
}
