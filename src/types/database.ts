export type UserRole = 'admin' | 'user'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  created_at: string
}

export interface Card {
  id: string
  name: string
  last_four_digits: string
  bank: string
  is_active: boolean
  created_at: string
}

export interface Area {
  id: string
  name: string
  description: string | null
  color: string
  is_active: boolean
  created_at: string
}

export interface Deposit {
  id: string
  card_id: string
  amount: number
  reference_month: string
  description: string | null
  created_at: string
  card?: Card
}

export interface Allocation {
  id: string
  deposit_id: string
  area_id: string
  amount: number
  area?: Area
}

export interface BudgetLine {
  id: string
  area_id: string
  name: string
  planned_amount: number
  reference_month: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BudgetLineBalance {
  id: string
  area_id: string
  name: string
  planned_amount: number
  reference_month: string
  description: string | null
  is_active: boolean
  spent: number
  balance: number
  accumulated_planned: number
  accumulated_spent: number
  accumulated_balance: number
}

export interface Expense {
  id: string
  card_id: string
  area_id: string
  budget_line_id?: string
  amount: number
  description: string
  expense_date: string
  reference_month: string
  created_by: string
  created_at: string
  card?: Card
  area?: Area
  profile?: Profile
  budget_line?: BudgetLine
}

// View types
export interface CardBalance {
  card_id: string
  card_name: string
  bank: string
  last_four_digits: string
  is_active: boolean
  total_deposits: number
  total_expenses: number
  balance: number
}

export interface AreaCardBalance {
  area_id: string
  area_name: string
  area_color: string
  card_id: string
  card_name: string
  allocated: number
  spent: number
  balance: number
}

export interface AreaBalance {
  area_id: string
  area_name: string
  area_color: string
  is_active: boolean
  total_allocated: number
  total_spent: number
  balance: number
}

export interface MonthlySummary {
  reference_month: string
  card_id: string
  card_name: string
  area_id: string
  area_name: string
  area_color: string
  total_expenses: number
  expense_count: number
}
