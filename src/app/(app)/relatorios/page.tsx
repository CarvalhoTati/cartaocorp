import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/layout/page-header'
import { CSVExport } from '@/components/dashboard/csv-export'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getReportByArea, getReportByCard, getDetailedReport } from '@/actions/reports'

export default async function RelatoriosPage() {
  const [areaReport, cardReport, detailedReport] = await Promise.all([
    getReportByArea(),
    getReportByCard(),
    getDetailedReport(),
  ])

  return (
    <>
      <PageHeader title="Relatórios" description="Relatórios e exportação de dados" />

      <Tabs defaultValue="areas">
        <TabsList>
          <TabsTrigger value="areas">Por Área</TabsTrigger>
          <TabsTrigger value="cards">Por Cartão</TabsTrigger>
          <TabsTrigger value="detailed">Detalhado</TabsTrigger>
        </TabsList>

        <TabsContent value="areas" className="space-y-4">
          <div className="flex justify-end">
            <CSVExport
              data={areaReport}
              filename="relatorio-areas"
              headers={[
                { key: 'area_name', label: 'Área' },
                { key: 'total_allocated', label: 'Alocado' },
                { key: 'total_spent', label: 'Gasto' },
                { key: 'balance', label: 'Saldo' },
              ]}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Relatório por Área</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Área</TableHead>
                    <TableHead className="text-right">Alocado</TableHead>
                    <TableHead className="text-right">Gasto</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">% Utilizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {areaReport.map((area: any) => {
                    const pct = area.total_allocated > 0
                      ? ((area.total_spent / area.total_allocated) * 100).toFixed(1)
                      : '0.0'
                    return (
                      <TableRow key={area.area_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: area.area_color }} />
                            {area.area_name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(area.total_allocated)}</TableCell>
                        <TableCell className="text-right text-red-600">{formatCurrency(area.total_spent)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(area.balance)}</TableCell>
                        <TableCell className="text-right">{pct}%</TableCell>
                      </TableRow>
                    )
                  })}
                  {areaReport.length > 0 && (
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(areaReport.reduce((s: number, a: any) => s + Number(a.total_allocated), 0))}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(areaReport.reduce((s: number, a: any) => s + Number(a.total_spent), 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(areaReport.reduce((s: number, a: any) => s + Number(a.balance), 0))}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cards" className="space-y-4">
          <div className="flex justify-end">
            <CSVExport
              data={cardReport}
              filename="relatorio-cartoes"
              headers={[
                { key: 'card_name', label: 'Cartão' },
                { key: 'bank', label: 'Banco' },
                { key: 'last_four_digits', label: 'Final' },
                { key: 'total_deposits', label: 'Depósitos' },
                { key: 'total_expenses', label: 'Despesas' },
                { key: 'balance', label: 'Saldo' },
              ]}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Relatório por Cartão</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cartão</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead className="text-right">Depósitos</TableHead>
                    <TableHead className="text-right">Despesas</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cardReport.map((card: any) => (
                    <TableRow key={card.card_id}>
                      <TableCell>{card.card_name} •••• {card.last_four_digits}</TableCell>
                      <TableCell>{card.bank}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(card.total_deposits)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(card.total_expenses)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(card.balance)}</TableCell>
                    </TableRow>
                  ))}
                  {cardReport.length > 0 && (
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(cardReport.reduce((s: number, c: any) => s + Number(c.total_deposits), 0))}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(cardReport.reduce((s: number, c: any) => s + Number(c.total_expenses), 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(cardReport.reduce((s: number, c: any) => s + Number(c.balance), 0))}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          <div className="flex justify-end">
            <CSVExport
              data={detailedReport.map((e: any) => ({
                ...e,
                card_name: e.card?.name,
                card_digits: e.card?.last_four_digits,
                area_name: e.area?.name,
                user_name: e.profile?.full_name,
              }))}
              filename="relatorio-detalhado"
              headers={[
                { key: 'expense_date', label: 'Data' },
                { key: 'description', label: 'Descrição' },
                { key: 'card_name', label: 'Cartão' },
                { key: 'card_digits', label: 'Final' },
                { key: 'area_name', label: 'Área' },
                { key: 'amount', label: 'Valor' },
                { key: 'user_name', label: 'Criado por' },
              ]}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Relatório Detalhado ({detailedReport.length} despesas)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Cartão</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Criado por</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailedReport.map((exp: any) => (
                    <TableRow key={exp.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(exp.expense_date)}</TableCell>
                      <TableCell>{exp.description}</TableCell>
                      <TableCell>{exp.card?.name} •••• {exp.card?.last_four_digits}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: exp.area?.color }} />
                          {exp.area?.name}
                        </div>
                      </TableCell>
                      <TableCell>{exp.profile?.full_name || '-'}</TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {formatCurrency(exp.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {detailedReport.length > 0 && (
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell colSpan={5}>Total</TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(detailedReport.reduce((s: number, e: any) => s + Number(e.amount), 0))}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
