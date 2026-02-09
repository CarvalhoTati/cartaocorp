import { z } from 'zod'

export const cardSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  last_four_digits: z.string().length(4, 'Informe os 4 últimos dígitos'),
  bank: z.string().min(1, 'Banco é obrigatório'),
})

export const areaSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  color: z.string().min(1, 'Cor é obrigatória'),
})

export const depositSchema = z.object({
  card_id: z.string().uuid('Selecione um cartão'),
  amount: z.number().positive('Valor deve ser positivo'),
  reference_month: z.string().min(1, 'Mês de referência é obrigatório'),
  description: z.string().optional(),
})

export const allocationSchema = z.object({
  area_id: z.string().uuid('Selecione uma área'),
  amount: z.number().min(0, 'Valor não pode ser negativo'),
})

export const budgetLineSchema = z.object({
  area_id: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório'),
  planned_amount: z.number().positive('Valor deve ser positivo'),
  reference_month: z.string().min(1, 'Mês é obrigatório'),
  description: z.string().optional(),
})

export const expenseSchema = z.object({
  card_id: z.string().uuid('Selecione um cartão'),
  area_id: z.string().uuid('Selecione uma área'),
  budget_line_id: z.string().uuid().optional(),
  amount: z.number().positive('Valor deve ser positivo'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  expense_date: z.string().min(1, 'Data é obrigatória'),
  reference_month: z.string().min(1, 'Mês de referência é obrigatório'),
})

export type CardFormData = z.infer<typeof cardSchema>
export type AreaFormData = z.infer<typeof areaSchema>
export type DepositFormData = z.infer<typeof depositSchema>
export type AllocationFormData = z.infer<typeof allocationSchema>
export type BudgetLineFormData = z.infer<typeof budgetLineSchema>
export type ExpenseFormData = z.infer<typeof expenseSchema>
