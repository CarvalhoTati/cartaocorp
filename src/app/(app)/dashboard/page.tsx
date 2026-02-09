import { createClient } from '@/lib/supabase/server'
import { KPICards } from '@/components/dashboard/kpi-cards'
import { AreaExpenseChart } from '@/components/dashboard/area-chart'
import { RecentExpenses } from '@/components/dashboard/recent-expenses'
import { PageHeader } from '@/components/layout/page-header'
import { getCurrentMonth } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()
  const currentMonth = getCurrentMonth()

  const [
    { data: cardBalances },
    { data: monthlySummary },
    { data: monthlyExpenses },
    { data: recentExpenses },
  ] = await Promise.all([
    supabase.from('v_card_balance').select('*'),
    supabase.from('v_monthly_summary').select('*').eq('reference_month', currentMonth),
    supabase.from('expenses').select('amount').eq('reference_month', currentMonth),
    supabase
      .from('expenses')
      .select('*, card:cards(name, last_four_digits), area:areas(name, color)')
      .order('expense_date', { ascending: false })
      .limit(10),
  ])

  const totalBalance = (cardBalances || []).reduce(
    (sum: number, cb: any) => sum + Number(cb.balance),
    0
  )

  const totalMonthlyExpenses = (monthlyExpenses || []).reduce(
    (sum: number, e: any) => sum + Number(e.amount),
    0
  )

  const expenseCount = monthlyExpenses?.length || 0

  // Build chart data: group by area
  const areaMap = new Map<string, { name: string; total: number; color: string }>()
  ;(monthlySummary || []).forEach((ms: any) => {
    const existing = areaMap.get(ms.area_id)
    if (existing) {
      existing.total += Number(ms.total_expenses)
    } else {
      areaMap.set(ms.area_id, {
        name: ms.area_name,
        total: Number(ms.total_expenses),
        color: ms.area_color,
      })
    }
  })
  const chartData = Array.from(areaMap.values()).sort((a, b) => b.total - a.total)

  return (
    <>
      <PageHeader title="Dashboard" description="Visão geral dos cartões corporativos" />
      <KPICards
        totalBalance={totalBalance}
        monthlyExpenses={totalMonthlyExpenses}
        expenseCount={expenseCount}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <AreaExpenseChart data={chartData} />
        <RecentExpenses expenses={recentExpenses || []} />
      </div>
    </>
  )
}
