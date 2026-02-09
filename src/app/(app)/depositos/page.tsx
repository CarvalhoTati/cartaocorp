import Link from 'next/link'
import { ArrowDownToLine, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/layout/empty-state'
import { formatCurrency, formatMonth, formatDate } from '@/lib/utils'
import { getDeposits } from '@/actions/deposits'

export default async function DepositosPage() {
  const deposits = await getDeposits()

  return (
    <>
      <PageHeader title="Depósitos" description="Adições de saldo aos cartões">
        <Link href="/depositos/novo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Depósito
          </Button>
        </Link>
      </PageHeader>

      {deposits.length === 0 ? (
        <EmptyState
          icon={ArrowDownToLine}
          title="Nenhum depósito registrado"
          description="Crie seu primeiro depósito para adicionar saldo ao cartão"
        >
          <Link href="/depositos/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Criar Depósito
            </Button>
          </Link>
        </EmptyState>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Todos os Depósitos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cartão</TableHead>
                  <TableHead>Mês Ref.</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Alocações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deposits.map((dep: any) => (
                  <TableRow key={dep.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(dep.created_at)}</TableCell>
                    <TableCell>
                      {dep.card?.name} •••• {dep.card?.last_four_digits}
                    </TableCell>
                    <TableCell>{formatMonth(dep.reference_month)}</TableCell>
                    <TableCell>{dep.description || '-'}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(dep.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {dep.allocations?.map((alloc: any) => (
                          <Badge key={alloc.id} variant="outline" className="text-xs">
                            <div
                              className="w-2 h-2 rounded-full mr-1"
                              style={{ backgroundColor: alloc.area?.color }}
                            />
                            {alloc.area?.name}: {formatCurrency(alloc.amount)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  )
}
