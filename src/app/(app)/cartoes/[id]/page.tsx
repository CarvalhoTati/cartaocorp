import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/layout/page-header'
import { formatCurrency, formatDate, formatMonth } from '@/lib/utils'
import { getCard, getCardBalance } from '@/actions/cards'
import { createClient } from '@/lib/supabase/server'

export default async function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let card, balance
  try {
    ;[card, balance] = await Promise.all([getCard(id), getCardBalance(id)])
  } catch {
    notFound()
  }

  const supabase = await createClient()

  const [{ data: areaBalances }, { data: deposits }, { data: expenses }] = await Promise.all([
    supabase.from('v_area_card_balance').select('*').eq('card_id', id),
    supabase.from('deposits').select('*, allocations(*, area:areas(*))').eq('card_id', id).order('created_at', { ascending: false }),
    supabase.from('expenses').select('*, area:areas(name, color)').eq('card_id', id).order('expense_date', { ascending: false }).limit(20),
  ])

  return (
    <>
      <PageHeader title={card.name} description={`${card.bank} •••• ${card.last_four_digits}`}>
        <div className="flex gap-2">
          <Link href="/cartoes">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <Link href={`/cartoes/${id}/editar`}>
            <Button size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Balance Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Depositado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(balance.total_deposits)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Gasto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(balance.total_expenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(balance.balance)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Balance by Area */}
      {areaBalances && areaBalances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saldo por Área</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Área</TableHead>
                  <TableHead className="text-right">Alocado</TableHead>
                  <TableHead className="text-right">Gasto</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {areaBalances.map((ab: any) => (
                  <TableRow key={ab.area_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ab.area_color }} />
                        {ab.area_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(ab.allocated)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(ab.spent)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(ab.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Deposits */}
      {deposits && deposits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Depósitos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês Ref.</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Alocações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deposits.map((dep: any) => (
                  <TableRow key={dep.id}>
                    <TableCell>{formatMonth(dep.reference_month)}</TableCell>
                    <TableCell className="font-semibold text-green-600">{formatCurrency(dep.amount)}</TableCell>
                    <TableCell>{dep.description || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {dep.allocations?.map((alloc: any) => (
                          <Badge key={alloc.id} variant="outline" className="text-xs">
                            <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: alloc.area?.color }} />
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
                  <TableHead>Área</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((exp: any) => (
                  <TableRow key={exp.id}>
                    <TableCell>{formatDate(exp.expense_date)}</TableCell>
                    <TableCell>{exp.description}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: exp.area?.color }} />
                        {exp.area?.name}
                      </div>
                    </TableCell>
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
