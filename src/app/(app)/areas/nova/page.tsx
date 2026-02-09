import { AreaForm } from '@/components/areas/area-form'
import { PageHeader } from '@/components/layout/page-header'

export default function NovaAreaPage() {
  return (
    <>
      <PageHeader title="Nova Área" description="Crie um novo centro de custo" />
      <AreaForm />
    </>
  )
}
