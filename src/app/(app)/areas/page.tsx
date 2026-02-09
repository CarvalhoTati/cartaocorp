import Link from 'next/link'
import { FolderOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/layout/empty-state'
import { formatCurrency } from '@/lib/utils'
import { getAreaBalances } from '@/actions/areas'

export default async function AreasPage() {
  const balances = await getAreaBalances()

  return (
    <>
      <PageHeader title="Áreas" description="Centros de custo e departamentos">
        <Link href="/areas/nova">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Área
          </Button>
        </Link>
      </PageHeader>

      {balances.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Nenhuma área cadastrada"
          description="Crie sua primeira área para organizar as despesas"
        >
          <Link href="/areas/nova">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Criar Área
            </Button>
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {balances.map((area) => (
            <Link key={area.area_id} href={`/areas/${area.area_id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: area.area_color }}
                    />
                    <CardTitle className="text-lg">{area.area_name}</CardTitle>
                  </div>
                  <Badge variant={area.is_active ? 'default' : 'secondary'}>
                    {area.is_active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Alocado</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(area.total_allocated)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gasto</p>
                      <p className="font-semibold text-red-600">
                        {formatCurrency(area.total_spent)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Saldo</p>
                      <p className="font-bold text-lg">
                        {formatCurrency(area.balance)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
