'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createBudgetLine, updateBudgetLine } from '@/actions/budget-lines'
import { getMonthOptions } from '@/lib/utils'
import type { BudgetLine } from '@/types/database'

interface BudgetLineFormProps {
  areaId: string
  budgetLine?: BudgetLine
}

export function BudgetLineForm({ areaId, budgetLine }: BudgetLineFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(budgetLine?.name || '')
  const [plannedAmount, setPlannedAmount] = useState(
    budgetLine ? String(budgetLine.planned_amount) : ''
  )
  const [referenceMonth, setReferenceMonth] = useState(
    budgetLine?.reference_month || getMonthOptions()[0].value
  )
  const [description, setDescription] = useState(budgetLine?.description || '')

  const monthOptions = getMonthOptions()
  const isEdit = !!budgetLine

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const formData = {
      area_id: areaId,
      name,
      planned_amount: parseFloat(plannedAmount) || 0,
      reference_month: referenceMonth,
      description: description || undefined,
    }

    const result = isEdit
      ? await updateBudgetLine(budgetLine.id, formData)
      : await createBudgetLine(formData)

    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(isEdit ? 'Rubrica atualizada!' : 'Rubrica criada!')
    router.push(`/areas/${areaId}`)
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>{isEdit ? 'Editar Rubrica' : 'Nova Rubrica'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              placeholder="Ex: Almoço, Brinde, Treinamento..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Valor Planejado (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="500.00"
              value={plannedAmount}
              onChange={(e) => setPlannedAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Mês de Referência</Label>
            <Select value={referenceMonth} onValueChange={setReferenceMonth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea
              placeholder="Detalhes sobre esta rubrica..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : isEdit ? 'Atualizar' : 'Criar Rubrica'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
