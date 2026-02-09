import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface RecentExpensesProps {
  expenses: any[]
}

export function RecentExpenses({ expenses }: RecentExpensesProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Despesas Recentes</CardTitle>
        <Link href="/despesas">
          <Button variant="ghost" size="sm">
            Ver todas
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">
            Nenhuma despesa registrada
          </p>
        ) : (
          <div className="space-y-3">
            {expenses.map((exp: any) => (
              <div key={exp.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: exp.area?.color }}
                  />
                  <div>
                    <p className="text-sm font-medium">{exp.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {exp.card?.name} • {exp.area?.name} • {formatDate(exp.expense_date)}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-red-600">
                  -{formatCurrency(exp.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
