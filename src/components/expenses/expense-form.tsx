'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { createExpense, updateExpense, getAvailableBalance, getBudgetLineBalance } from '@/actions/expenses'
import { getAreasForCard } from '@/actions/areas'
import { getBudgetLines, getDistinctBudgetLineNames, createBudgetLine } from '@/actions/budget-lines'
import { formatCurrency, getMonthOptions } from '@/lib/utils'
import type { Card as CardType, Area, BudgetLine, Expense } from '@/types/database'

interface ExpenseFormProps {
  cards: CardType[]
  areas: Area[]
  expense?: Expense
}

export function ExpenseForm({ cards, areas: allAreas, expense }: ExpenseFormProps) {
  const router = useRouter()
  const isEditing = !!expense
  const [loading, setLoading] = useState(false)
  const [cardId, setCardId] = useState(expense?.card_id || '')
  const [areaId, setAreaId] = useState(expense?.area_id || '')
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [description, setDescription] = useState(expense?.description || '')
  const [expenseDate, setExpenseDate] = useState(expense?.expense_date || new Date().toISOString().split('T')[0])
  const [referenceMonth, setReferenceMonth] = useState(expense?.reference_month || getMonthOptions()[0].value)
  const [filteredAreas, setFilteredAreas] = useState<Area[]>(allAreas)
  const [loadingAreas, setLoadingAreas] = useState(false)
  const [budgetLineId, setBudgetLineId] = useState(expense?.budget_line_id || '')
  const [budgetLinesForArea, setBudgetLinesForArea] = useState<BudgetLine[]>([])
  const [budgetLineBalance, setBudgetLineBalance] = useState<number | null>(null)
  const [availableBalance, setAvailableBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)

  // Dialog para criar rubrica inline
  const [showNewBudgetLine, setShowNewBudgetLine] = useState(false)
  const [newBLName, setNewBLName] = useState('')
  const [newBLCustomName, setNewBLCustomName] = useState('')
  const [newBLIsCustom, setNewBLIsCustom] = useState(false)
  const [newBLPlannedAmount, setNewBLPlannedAmount] = useState('')
  const [newBLDescription, setNewBLDescription] = useState('')
  const [existingBLNames, setExistingBLNames] = useState<string[]>([])
  const [savingBL, setSavingBL] = useState(false)

  const monthOptions = getMonthOptions()
  const parsedAmount = parseFloat(amount) || 0
  const exceedsBalance = availableBalance !== null && parsedAmount > availableBalance
  const isFirstRender = useRef(true)
  const isFirstCardChange = useRef(true)

  useEffect(() => {
    if (!cardId) {
      setFilteredAreas(allAreas)
      return
    }
    setLoadingAreas(true)
    getAreasForCard(cardId).then((areas) => {
      setFilteredAreas(areas)
      setLoadingAreas(false)
      if (isFirstCardChange.current) {
        isFirstCardChange.current = false
      } else {
        setAreaId('')
        setAvailableBalance(null)
      }
    })
  }, [cardId])

  useEffect(() => {
    if (areaId) {
      getBudgetLines(areaId).then((lines) => {
        setBudgetLinesForArea(lines)
      })
    } else {
      setBudgetLinesForArea([])
    }
    if (isFirstRender.current) {
      isFirstRender.current = false
    } else {
      setBudgetLineId('')
      setBudgetLineBalance(null)
    }
  }, [areaId])

  useEffect(() => {
    if (budgetLineId) {
      getBudgetLineBalance(budgetLineId).then((balance) => {
        setBudgetLineBalance(balance)
      })
    } else {
      setBudgetLineBalance(null)
    }
  }, [budgetLineId])

  useEffect(() => {
    if (cardId && areaId) {
      setLoadingBalance(true)
      getAvailableBalance(cardId, areaId).then((balance) => {
        setAvailableBalance(balance)
        setLoadingBalance(false)
      })
    } else {
      setAvailableBalance(null)
    }
  }, [cardId, areaId])

  async function handleOpenNewBudgetLine() {
    const names = await getDistinctBudgetLineNames()
    setExistingBLNames(names)
    setNewBLName('')
    setNewBLCustomName('')
    setNewBLIsCustom(false)
    setNewBLPlannedAmount('')
    setNewBLDescription('')
    setShowNewBudgetLine(true)
  }

  async function handleSaveNewBudgetLine() {
    const finalName = newBLIsCustom ? newBLCustomName.trim() : newBLName
    if (!finalName) {
      toast.error('Informe o nome da rubrica')
      return
    }
    const planned = parseFloat(newBLPlannedAmount)
    if (!planned || planned <= 0) {
      toast.error('Informe um valor planejado válido')
      return
    }

    setSavingBL(true)
    const result = await createBudgetLine({
      area_id: areaId,
      name: finalName,
      planned_amount: planned,
      reference_month: referenceMonth,
      description: newBLDescription || undefined,
    })
    setSavingBL(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success('Rubrica criada!')
    setShowNewBudgetLine(false)

    // Recarregar rubricas da área e selecionar a nova
    const updatedLines = await getBudgetLines(areaId)
    setBudgetLinesForArea(updatedLines)
    const created = updatedLines.find((bl) => bl.name === finalName)
    if (created) setBudgetLineId(created.id)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (exceedsBalance) {
      toast.error('Valor excede o saldo disponível')
      return
    }

    setLoading(true)
    const expenseData: Parameters<typeof createExpense>[0] = {
      card_id: cardId,
      area_id: areaId,
      budget_line_id: budgetLineId,
      amount: parsedAmount,
      description,
      expense_date: expenseDate,
      reference_month: referenceMonth,
    }

    const result = isEditing
      ? await updateExpense(expense.id, expenseData)
      : await createExpense(expenseData)

    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(isEditing ? 'Despesa atualizada!' : 'Despesa registrada!')
    router.push('/despesas')
  }

  return (
    <>
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>{isEditing ? 'Editar Despesa' : 'Nova Despesa'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cartão</Label>
              <Select value={cardId} onValueChange={setCardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cartão" />
                </SelectTrigger>
                <SelectContent>
                  {cards.filter((c) => c.is_active).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} •••• {c.last_four_digits}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Área</Label>
              <Select value={areaId} onValueChange={setAreaId} disabled={!cardId || loadingAreas}>
                <SelectTrigger>
                  <SelectValue placeholder={
                    !cardId
                      ? 'Selecione o cartão primeiro'
                      : loadingAreas
                      ? 'Carregando áreas...'
                      : 'Selecione a área'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {filteredAreas.length === 0 ? (
                    <SelectItem value="_empty" disabled>
                      Nenhuma área alocada para este cartão
                    </SelectItem>
                  ) : (
                    filteredAreas.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: a.color }} />
                          {a.name}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {cardId && !loadingAreas && filteredAreas.length === 0 && (
                <p className="text-sm text-amber-600">
                  Este cartão não possui alocações em nenhuma área. Crie um depósito com alocação primeiro.
                </p>
              )}
            </div>
          </div>

          {/* Available balance display */}
          {cardId && areaId && (
            <div className={`p-3 rounded-md text-sm ${
              loadingBalance
                ? 'bg-muted text-muted-foreground'
                : exceedsBalance
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {loadingBalance ? (
                'Verificando saldo...'
              ) : (
                <>
                  Saldo disponível: <span className="font-bold">{formatCurrency(availableBalance || 0)}</span>
                  {exceedsBalance && ' — Valor excede o saldo!'}
                </>
              )}
            </div>
          )}

          {/* Budget Line (Rubrica) - obrigatória */}
          {areaId && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Rubrica</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenNewBudgetLine}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Rubrica
                </Button>
              </div>
              {budgetLinesForArea.length > 0 ? (
                <>
                  <Select value={budgetLineId} onValueChange={setBudgetLineId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a rubrica" />
                    </SelectTrigger>
                    <SelectContent>
                      {budgetLinesForArea.map((bl) => (
                        <SelectItem key={bl.id} value={bl.id}>
                          {bl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {budgetLineId && budgetLineBalance !== null && (
                    <p className="text-sm text-muted-foreground">
                      Saldo da rubrica: <span className="font-semibold">{formatCurrency(budgetLineBalance)}</span>
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-amber-600">
                  Esta área não possui rubricas cadastradas. Use o botão acima para criar uma.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="100.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              placeholder="Descreva a despesa..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da despesa</Label>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Mês de referência</Label>
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
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || exceedsBalance || !cardId || !areaId || !budgetLineId}>
            {loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Registrar Despesa'}
          </Button>
        </CardFooter>
      </form>
    </Card>

    {/* Dialog para criar rubrica inline */}
    <Dialog open={showNewBudgetLine} onOpenChange={setShowNewBudgetLine}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Rubrica</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome</Label>
            {existingBLNames.length > 0 ? (
              <>
                <Select
                  value={newBLIsCustom ? '__other__' : newBLName}
                  onValueChange={(v) => {
                    if (v === '__other__') {
                      setNewBLIsCustom(true)
                      setNewBLName('')
                    } else {
                      setNewBLIsCustom(false)
                      setNewBLName(v)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione ou crie nova" />
                  </SelectTrigger>
                  <SelectContent>
                    {existingBLNames.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                    <SelectItem value="__other__">Outro (digitar nome)</SelectItem>
                  </SelectContent>
                </Select>
                {newBLIsCustom && (
                  <Input
                    placeholder="Digite o nome da nova rubrica..."
                    value={newBLCustomName}
                    onChange={(e) => setNewBLCustomName(e.target.value)}
                    autoFocus
                  />
                )}
              </>
            ) : (
              <Input
                placeholder="Ex: Almoço, Brinde, Treinamento..."
                value={newBLCustomName}
                onChange={(e) => {
                  setNewBLCustomName(e.target.value)
                  setNewBLIsCustom(true)
                }}
                autoFocus
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Valor Planejado (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="500.00"
              value={newBLPlannedAmount}
              onChange={(e) => setNewBLPlannedAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea
              placeholder="Detalhes sobre esta rubrica..."
              value={newBLDescription}
              onChange={(e) => setNewBLDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setShowNewBudgetLine(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSaveNewBudgetLine}
            disabled={savingBL || (newBLIsCustom ? !newBLCustomName.trim() : !newBLName)}
          >
            {savingBL ? 'Salvando...' : 'Criar Rubrica'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
