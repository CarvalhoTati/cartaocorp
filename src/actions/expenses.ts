'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { expenseSchema, type ExpenseFormData } from '@/lib/validations'

export async function getExpenses(filters?: {
  card_id?: string
  area_id?: string
  reference_month?: string
}) {
  const supabase = await createClient()

  // Try with budget_line join first, fallback without it if migration not yet applied
  const selectWithBudgetLine = '*, card:cards(name, last_four_digits), area:areas(name, color), budget_line:budget_lines(name)'
  const selectWithout = '*, card:cards(name, last_four_digits), area:areas(name, color)'

  for (const selectStr of [selectWithBudgetLine, selectWithout]) {
    let query = supabase
      .from('expenses')
      .select(selectStr)
      .order('expense_date', { ascending: false })

    if (filters?.card_id) query = query.eq('card_id', filters.card_id)
    if (filters?.area_id) query = query.eq('area_id', filters.area_id)
    if (filters?.reference_month) query = query.eq('reference_month', filters.reference_month)

    const { data, error } = await query
    if (!error) return data
    // If first attempt fails (budget_lines table missing), try without
    if (selectStr === selectWithout) throw new Error(error.message)
  }

  return []
}

export async function createExpense(formData: ExpenseFormData) {
  const parsed = expenseSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const insertData: Record<string, unknown> = {
    card_id: parsed.data.card_id,
    area_id: parsed.data.area_id,
    amount: parsed.data.amount,
    description: parsed.data.description,
    expense_date: parsed.data.expense_date,
    reference_month: parsed.data.reference_month,
    created_by: user.id,
  }
  if (parsed.data.budget_line_id) {
    insertData.budget_line_id = parsed.data.budget_line_id
  }

  const { error } = await supabase
    .from('expenses')
    .insert(insertData)

  if (error) return { error: error.message }

  revalidatePath('/despesas')
  revalidatePath('/cartoes')
  revalidatePath('/areas')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteExpense(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/despesas')
  revalidatePath('/cartoes')
  revalidatePath('/areas')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function getBudgetLineBalance(budgetLineId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_budget_line_balance')
    .select('balance')
    .eq('id', budgetLineId)
    .single()

  if (error) return 0
  return Number(data?.balance) || 0
}

export async function getAvailableBalance(cardId: string, areaId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_area_card_balance')
    .select('balance')
    .eq('card_id', cardId)
    .eq('area_id', areaId)
    .single()

  if (error) return 0
  return Number(data?.balance) || 0
}
