import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/layout/page-header'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getArea, getAreaCardBalances } from '@/actions/areas'
import { createClient } from '@/lib/supabase/server'

export default async function AreaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let area
  try {
    area = await getArea(id)
  } catch {
    notFound()
  }

  const supabase = await createClient()
  const [cardBalances, { data: expenses }] = await Promise.all([
    getAreaCardBalances(id),
    supabase
      .from('expenses')
      .select('*, card:cards(name, last_four_digits)')
      .eq('area_id', id)
      .order('expense_date', { ascending: false })
      .limit(20),
  ])

  const totalAllocated = cardBalances.reduce((sum: number, cb: any) => sum + Number(cb.allocated), 0)
  const totalSpent = cardBalances.reduce((sum: number, cb: any) => sum + Number(cb.spent), 0)

  return (
    <>
      <PageHeader
        title={area.name}
        description={area.description || 'Sem descrição'}
      >
        <Link href="/areas">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </PageHeader>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Alocado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalAllocated)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Gasto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalSpent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalAllocated - totalSpent)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Balance by Card */}
      {cardBalances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saldo por Cartão</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cartão</TableHead>
                  <TableHead className="text-right">Alocado</TableHead>
                  <TableHead className="text-right">Gasto</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cardBalances.map((cb: any) => (
                  <TableRow key={cb.card_id}>
                    <TableCell>{cb.card_name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(cb.allocated)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(cb.spent)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(cb.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Expenses */}
      {expenses && expenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Despesas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Cartão</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((exp: any) => (
                  <TableRow key={exp.id}>
                    <TableCell>{formatDate(exp.expense_date)}</TableCell>
                    <TableCell>{exp.description}</TableCell>
                    <TableCell>{exp.card?.name} •••• {exp.card?.last_four_digits}</TableCell>
                    <TableCell className="text-right text-red-600 font-medium">
                      {formatCurrency(exp.amount)}
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
