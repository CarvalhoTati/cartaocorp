'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { areaSchema, type AreaFormData } from '@/lib/validations'

export async function getAreas() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('areas')
    .select('*')
    .order('name')

  if (error) throw new Error(error.message)
  return data
}

export async function getArea(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('areas')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getAreaBalances() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_area_balance')
    .select('*')

  if (error) throw new Error(error.message)
  return data
}

export async function getAreaCardBalances(areaId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_area_card_balance')
    .select('*')
    .eq('area_id', areaId)

  if (error) throw new Error(error.message)
  return data
}

export async function createArea(formData: AreaFormData) {
  const parsed = areaSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('areas')
    .insert(parsed.data)

  if (error) return { error: error.message }

  revalidatePath('/areas')
  return { success: true }
}

export async function updateArea(id: string, formData: AreaFormData) {
  const parsed = areaSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('areas')
    .update(parsed.data)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/areas')
  revalidatePath(`/areas/${id}`)
  return { success: true }
}

export async function toggleAreaActive(id: string, isActive: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('areas')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/areas')
  return { success: true }
}
