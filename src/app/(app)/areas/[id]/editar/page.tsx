import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { AreaForm } from '@/components/areas/area-form'
import { getArea } from '@/actions/areas'

export default async function EditAreaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let area
  try {
    area = await getArea(id)
  } catch {
    notFound()
  }

  return (
    <>
      <PageHeader title="Editar Área" description={area.name}>
        <Link href={`/areas/${id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </PageHeader>
      <AreaForm area={area} />
    </>
  )
}
