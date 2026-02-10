'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { cardSchema, type CardFormData } from '@/lib/validations'

export async function getCards() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function getCard(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getCardBalances() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_card_balance')
    .select('*')

  if (error) throw new Error(error.message)
  return data
}

export async function getCardBalance(cardId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_card_balance')
    .select('*')
    .eq('card_id', cardId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function createCard(formData: CardFormData) {
  const parsed = cardSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('cards')
    .insert(parsed.data)

  if (error) return { error: error.message }

  revalidatePath('/cartoes')
  return { success: true }
}

export async function updateCard(id: string, formData: CardFormData) {
  const parsed = cardSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('cards')
    .update(parsed.data)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/cartoes')
  revalidatePath(`/cartoes/${id}`)
  return { success: true }
}

export async function getCardAreaIds(cardId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('card_areas')
    .select('area_id')
    .eq('card_id', cardId)

  if (error) return []
  return data.map((d) => d.area_id)
}

export async function setCardAreas(cardId: string, areaIds: string[]) {
  const supabase = await createClient()

  // Delete existing mappings
  const { error: delError } = await supabase
    .from('card_areas')
    .delete()
    .eq('card_id', cardId)

  if (delError) return { error: delError.message }

  // Insert new mappings
  if (areaIds.length > 0) {
    const rows = areaIds.map((area_id) => ({ card_id: cardId, area_id }))
    const { error: insError } = await supabase
      .from('card_areas')
      .insert(rows)

    if (insError) return { error: insError.message }
  }

  revalidatePath('/cartoes')
  revalidatePath(`/cartoes/${cardId}`)
  return { success: true }
}

export async function toggleCardActive(id: string, isActive: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('cards')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/cartoes')
  return { success: true }
}
