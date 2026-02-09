import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard, Receipt, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface KPICardsProps {
  totalBalance: number
  monthlyExpenses: number
  expenseCount: number
}

export function KPICards({ totalBalance, monthlyExpenses, expenseCount }: KPICardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Saldo Total
          </CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
          <p className="text-xs text-muted-foreground mt-1">Somatório de todos os cartões</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Despesas do Mês
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(monthlyExpenses)}</div>
          <p className="text-xs text-muted-foreground mt-1">Mês atual</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Qtd. Despesas
          </CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{expenseCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Lançamentos no mês</p>
        </CardContent>
      </Card>
    </div>
  )
}
