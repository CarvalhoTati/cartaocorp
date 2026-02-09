'use server'

import { createClient } from '@/lib/supabase/server'

export async function getReportByArea(referenceMonth?: string) {
  const supabase = await createClient()
  let query = supabase.from('v_area_balance').select('*')
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function getReportByCard(referenceMonth?: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('v_card_balance').select('*')
  if (error) throw new Error(error.message)
  return data
}

export async function getDetailedReport(referenceMonth?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('expenses')
    .select('*, card:cards(name, last_four_digits, bank), area:areas(name, color), profile:profiles(full_name)')
    .order('expense_date', { ascending: false })

  if (referenceMonth) {
    query = query.eq('reference_month', referenceMonth)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function getMonthlySummary(referenceMonth?: string) {
  const supabase = await createClient()
  let query = supabase.from('v_monthly_summary').select('*')
  if (referenceMonth) {
    query = query.eq('reference_month', referenceMonth)
  }
  const { data, error } = await query.order('reference_month', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}
