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
    .select('*, card:cards(name, last_four_digits, bank), area:areas(name, color)')
    .order('expense_date', { ascending: false })

  if (referenceMonth) {
    query = query.eq('reference_month', referenceMonth)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  if (!data || data.length === 0) return data

  // Fetch profiles separately (no direct FK from expenses to profiles)
  const userIds = [...new Set(data.map((e: any) => e.created_by).filter(Boolean))]
  if (userIds.length === 0) return data

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds)

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
  return data.map((e: any) => ({
    ...e,
    profile: profileMap.get(e.created_by) || null,
  }))
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
