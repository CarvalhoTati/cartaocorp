'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function getDeposits() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deposits')
    .select('*, card:cards(name, last_four_digits, bank), allocations(*, area:areas(name, color))')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function getDeposit(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deposits')
    .select('*, card:cards(name, last_four_digits, bank), allocations(*, area:areas(name, color))')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function createDepositWithAllocations(input: {
  card_id: string
  amount: number
  reference_month: string
  description?: string
  allocations: { area_id: string; amount: number }[]
}) {
  const supabase = await createClient()

  // Validate allocation sum on server side too
  const allocSum = input.allocations.reduce((s, a) => s + a.amount, 0)
  if (Math.abs(allocSum - input.amount) > 0.01) {
    return { error: `Soma das alocações (R$ ${allocSum.toFixed(2)}) difere do valor do depósito (R$ ${input.amount.toFixed(2)})` }
  }

  const { data, error } = await supabase.rpc('create_deposit_with_allocations', {
    p_card_id: input.card_id,
    p_amount: input.amount,
    p_reference_month: input.reference_month,
    p_description: input.description || null,
    p_allocations: input.allocations,
  })

  if (error) return { error: error.message }

  revalidatePath('/depositos')
  revalidatePath('/cartoes')
  revalidatePath('/areas')
  revalidatePath('/dashboard')
  return { success: true, deposit_id: data }
}

export async function updateDepositWithAllocations(
  depositId: string,
  input: {
    card_id: string
    amount: number
    reference_month: string
    description?: string
    allocations: { area_id: string; amount: number }[]
  }
) {
  const supabase = await createClient()

  const allocSum = input.allocations.reduce((s, a) => s + a.amount, 0)
  if (Math.abs(allocSum - input.amount) > 0.01) {
    return { error: `Soma das alocações (R$ ${allocSum.toFixed(2)}) difere do valor do depósito (R$ ${input.amount.toFixed(2)})` }
  }

  const { data, error } = await supabase.rpc('update_deposit_with_allocations', {
    p_deposit_id: depositId,
    p_card_id: input.card_id,
    p_amount: input.amount,
    p_reference_month: input.reference_month,
    p_description: input.description || null,
    p_allocations: input.allocations,
  })

  if (error) return { error: error.message }

  revalidatePath('/depositos')
  revalidatePath('/cartoes')
  revalidatePath('/areas')
  revalidatePath('/dashboard')
  return { success: true, deposit_id: data }
}

export async function deleteDeposit(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('deposits')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/depositos')
  revalidatePath('/cartoes')
  revalidatePath('/areas')
  revalidatePath('/dashboard')
  return { success: true }
}
