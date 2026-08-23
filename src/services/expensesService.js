import { supabase } from '../lib/supabaseClient.js'

const EXPENSES_TABLE = 'expenses'

export async function listExpenses() {
  const { data, error } = await supabase
    .from(EXPENSES_TABLE)
    .select('*')
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })

  return {
    data: data ?? [],
    error,
  }
}

export async function createExpense(payload) {
  const normalizedPayload = {
    vehicle_id: payload.vehicle_id,
    expense_date:
      payload.expense_date || new Date().toISOString().slice(0, 10),
    category: payload.category || 'other',
    description: payload.description || '',
    amount: Number(payload.amount ?? 0),
    source: payload.source || null,
    payment_method: payload.payment_method || null,
    notes: payload.notes || null,
    created_by: payload.created_by || null,
  }

  const { data, error } = await supabase
    .from(EXPENSES_TABLE)
    .insert(normalizedPayload)
    .select('*')
    .single()

  return { data, error }
}

export async function getExpensesByVehicle(vehicleId) {
  const { data, error } = await supabase
    .from(EXPENSES_TABLE)
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('expense_date', { ascending: false })

  return {
    data: data ?? [],
    error,
  }
}
export async function deleteExpense(id) {
  const { data, error } = await supabase
    .from(EXPENSES_TABLE)
    .delete()
    .eq('id', id)
    .select('*')
    .single()

  return { data, error }
}

export async function updateExpense(id, payload) {
  const normalizedPayload = {
    vehicle_id: payload.vehicle_id,
    expense_date: payload.expense_date,
    category: payload.category || 'other',
    description: payload.description || '',
    amount: Number(payload.amount ?? 0),
    source: payload.source || null,
    payment_method: payload.payment_method || null,
    notes: payload.notes || null,
  }

  const { data, error } = await supabase
    .from(EXPENSES_TABLE)
    .update(normalizedPayload)
    .eq('id', id)
    .select('*')
    .single()

  return { data, error }
}
