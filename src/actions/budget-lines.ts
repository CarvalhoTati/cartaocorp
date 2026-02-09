'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { budgetLineSchema, type BudgetLineFormData } from '@/lib/validations'

export async function getBudgetLines(areaId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('budget_lines')
    .select('*')
    .eq('area_id', areaId)
    .eq('is_active', true)
    .order('name')

  if (error) return []
  return data
}

export async function getBudgetLine(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('budget_lines')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getBudgetLineBalances(areaId: string, referenceMonth?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('v_budget_line_balance')
    .select('*')
    .eq('area_id', areaId)

  if (referenceMonth) {
    query = query.eq('reference_month', referenceMonth)
  }

  const { data, error } = await query.order('name')
  if (error) return []
  return data
}

export async function createBudgetLine(formData: BudgetLineFormData) {
  const parsed = budgetLineSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('budget_lines')
    .insert(parsed.data)

  if (error) return { error: error.message }

  revalidatePath('/areas')
  revalidatePath(`/areas/${parsed.data.area_id}`)
  return { success: true }
}

export async function updateBudgetLine(id: string, formData: BudgetLineFormData) {
  const parsed = budgetLineSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('budget_lines')
    .update(parsed.data)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/areas')
  revalidatePath(`/areas/${parsed.data.area_id}`)
  return { success: true }
}

export async function deleteBudgetLine(id: string) {
  const supabase = await createClient()

  // Get area_id before deleting for revalidation
  const { data: line } = await supabase
    .from('budget_lines')
    .select('area_id')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('budget_lines')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/areas')
  if (line) revalidatePath(`/areas/${line.area_id}`)
  return { success: true }
}
