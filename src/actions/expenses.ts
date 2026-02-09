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
  let query = supabase
    .from('expenses')
    .select('*, card:cards(name, last_four_digits), area:areas(name, color)')
    .order('expense_date', { ascending: false })

  if (filters?.card_id) query = query.eq('card_id', filters.card_id)
  if (filters?.area_id) query = query.eq('area_id', filters.area_id)
  if (filters?.reference_month) query = query.eq('reference_month', filters.reference_month)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function createExpense(formData: ExpenseFormData) {
  const parsed = expenseSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('expenses')
    .insert({
      ...parsed.data,
      created_by: user.id,
    })

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
