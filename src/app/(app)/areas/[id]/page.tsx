import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/layout/page-header'
import { BudgetLineActions } from '@/components/budget-lines/budget-line-actions'
import { formatCurrency, formatDate, formatMonth } from '@/lib/utils'
import { getArea, getAreaCardBalances } from '@/actions/areas'
import { getBudgetLineBalances } from '@/actions/budget-lines'
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
  const [cardBalances, budgetLineBalances, { data: expenses }] = await Promise.all([
    getAreaCardBalances(id),
    getBudgetLineBalances(id),
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
        <div className="flex gap-2">
          <Link href="/areas">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <Link href={`/areas/${id}/editar`}>
            <Button size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </Link>
        </div>
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

      {/* Budget Lines (Rubricas) */}
      {(() => {
        const totalPlanned = budgetLineBalances.reduce((sum: number, bl: any) => sum + Number(bl.planned_amount), 0)
        const totalBLSpent = budgetLineBalances.reduce((sum: number, bl: any) => sum + Number(bl.spent), 0)
        const unplanned = totalAllocated - totalPlanned
        const exceeds = totalPlanned > totalAllocated

        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Rubricas</CardTitle>
                {budgetLineBalances.length > 0 && (
                  <p className={`text-sm mt-1 ${exceeds ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                    {formatCurrency(totalPlanned)} de {formatCurrency(totalAllocated)} distribuídos
                    {exceeds
                      ? ` — excede em ${formatCurrency(totalPlanned - totalAllocated)}`
                      : unplanned > 0
                      ? ` — ${formatCurrency(unplanned)} sem rubrica`
                      : ''}
                  </p>
                )}
              </div>
              <Link href={`/areas/${id}/rubricas/nova`}>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Rubrica
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {budgetLineBalances.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma rubrica cadastrada.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Mês</TableHead>
                      <TableHead className="text-right">Planejado</TableHead>
                      <TableHead className="text-right">Gasto</TableHead>
                      <TableHead className="text-right">Saldo Mês</TableHead>
                      <TableHead className="text-right">Saldo Acumulado</TableHead>
                      <TableHead className="w-[180px]">Uso</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgetLineBalances.map((bl: any) => {
                      const accPlanned = Number(bl.accumulated_planned)
                      const accSpent = Number(bl.accumulated_spent)
                      const accBalance = Number(bl.accumulated_balance)
                      const pct = accPlanned > 0 ? (accSpent / accPlanned) * 100 : 0
                      const barColor = pct > 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-blue-500'

                      return (
                        <TableRow key={bl.id}>
                          <TableCell className="font-medium">{bl.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground capitalize whitespace-nowrap">
                            {formatMonth(bl.reference_month)}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(bl.planned_amount))}</TableCell>
                          <TableCell className="text-right text-red-600">{formatCurrency(Number(bl.spent))}</TableCell>
                          <TableCell className={`text-right ${Number(bl.balance) < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {formatCurrency(Number(bl.balance))}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${accBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(accBalance)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${barColor}`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <span className={`text-xs w-12 text-right ${pct > 100 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <BudgetLineActions areaId={id} lineId={bl.id} />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {/* Totals row */}
                    <TableRow className="border-t-2 font-semibold bg-muted/50">
                      <TableCell>Total</TableCell>
                      <TableCell />
                      <TableCell className={`text-right ${exceeds ? 'text-red-600' : ''}`}>
                        {formatCurrency(totalPlanned)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(totalBLSpent)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(totalPlanned - totalBLSpent)}
                      </TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )
      })()}

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
