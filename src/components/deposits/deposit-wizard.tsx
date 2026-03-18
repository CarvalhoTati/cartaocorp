'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, ArrowLeft, Check, Plus } from 'lucide-react'
import { createDepositWithAllocations, updateDepositWithAllocations } from '@/actions/deposits'
import { getAreasForCard } from '@/actions/areas'
import { getBudgetLines, getDistinctBudgetLineNames, createBudgetLine } from '@/actions/budget-lines'
import { formatCurrency, getMonthOptions } from '@/lib/utils'
import type { Card as CardType, Area, BudgetLine } from '@/types/database'

interface DepositData {
  id: string
  card_id: string
  amount: number
  reference_month: string
  description: string | null
  allocations?: { id: string; area_id: string; budget_line_id: string | null; amount: number }[]
}

interface DepositWizardProps {
  cards: CardType[]
  areas: Area[]
  deposit?: DepositData
}

// Key for allocation amounts: "areaId::budgetLineId"
type AllocKey = string
function makeKey(areaId: string, blId: string): AllocKey {
  return `${areaId}::${blId}`
}
function parseKey(key: AllocKey): { areaId: string; blId: string } {
  const [areaId, blId] = key.split('::')
  return { areaId, blId }
}

export function DepositWizard({ cards, areas, deposit }: DepositWizardProps) {
  const router = useRouter()
  const isEditing = !!deposit
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1 fields
  const [cardId, setCardId] = useState(deposit?.card_id || '')
  const [amount, setAmount] = useState(deposit ? String(deposit.amount) : '')
  const [referenceMonth, setReferenceMonth] = useState(() => {
    if (deposit?.reference_month) {
      const d = new Date(deposit.reference_month)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    }
    return getMonthOptions()[0].value
  })
  const [description, setDescription] = useState(deposit?.description || '')

  // Step 2 fields
  const [allocations, setAllocations] = useState<Record<AllocKey, string>>(() => {
    if (deposit?.allocations) {
      const alloc: Record<AllocKey, string> = {}
      deposit.allocations.forEach((a) => {
        if (a.budget_line_id) {
          alloc[makeKey(a.area_id, a.budget_line_id)] = String(a.amount)
        }
      })
      return alloc
    }
    return {}
  })

  const allActiveAreas = areas.filter((a) => a.is_active)
  const [filteredAreas, setFilteredAreas] = useState<Area[]>(allActiveAreas)
  const [loadingAreas, setLoadingAreas] = useState(false)
  const [budgetLinesByArea, setBudgetLinesByArea] = useState<Record<string, BudgetLine[]>>({})
  const [loadingBudgetLines, setLoadingBudgetLines] = useState(false)
  const isFirstCardChange = useRef(true)

  // Dialog para criar rubrica inline
  const [showNewBudgetLine, setShowNewBudgetLine] = useState(false)
  const [newBLAreaId, setNewBLAreaId] = useState('')
  const [newBLName, setNewBLName] = useState('')
  const [newBLCustomName, setNewBLCustomName] = useState('')
  const [newBLIsCustom, setNewBLIsCustom] = useState(false)
  const [newBLPlannedAmount, setNewBLPlannedAmount] = useState('')
  const [newBLDescription, setNewBLDescription] = useState('')
  const [existingBLNames, setExistingBLNames] = useState<string[]>([])
  const [savingBL, setSavingBL] = useState(false)

  // Load areas when card changes
  useEffect(() => {
    if (!cardId) {
      setFilteredAreas(allActiveAreas)
      return
    }
    setLoadingAreas(true)
    getAreasForCard(cardId).then((areas) => {
      setFilteredAreas(areas.length > 0 ? areas : allActiveAreas)
      setLoadingAreas(false)
      if (isFirstCardChange.current) {
        isFirstCardChange.current = false
      } else {
        setAllocations({})
        setBudgetLinesByArea({})
      }
    })
  }, [cardId])

  // Load budget lines for all filtered areas when entering step 2
  useEffect(() => {
    if (step !== 2 || filteredAreas.length === 0) return
    setLoadingBudgetLines(true)
    Promise.all(
      filteredAreas.map((area) =>
        getBudgetLines(area.id).then((lines) => ({ areaId: area.id, lines }))
      )
    ).then((results) => {
      const map: Record<string, BudgetLine[]> = {}
      results.forEach(({ areaId, lines }) => {
        map[areaId] = lines
      })
      setBudgetLinesByArea(map)
      setLoadingBudgetLines(false)
    })
  }, [step, filteredAreas])

  const parsedAmount = parseFloat(amount) || 0
  const monthOptions = getMonthOptions(24)

  // Include deposit's month in options if not already present
  const monthSet = new Set(monthOptions.map(m => m.value))
  if (referenceMonth && !monthSet.has(referenceMonth)) {
    const d = new Date(referenceMonth)
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d)
    monthOptions.push({ value: referenceMonth, label })
  }

  const allocTotal = Object.values(allocations).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0
  )
  const remaining = parsedAmount - allocTotal

  function handleAllocationChange(key: AllocKey, value: string) {
    setAllocations((prev) => ({ ...prev, [key]: value }))
  }

  // Get total allocated per area
  function getAreaTotal(areaId: string): number {
    return Object.entries(allocations).reduce((sum, [key, val]) => {
      const { areaId: kAreaId } = parseKey(key)
      if (kAreaId === areaId) return sum + (parseFloat(val) || 0)
      return sum
    }, 0)
  }

  function canProceed() {
    return cardId && parsedAmount > 0 && referenceMonth
  }

  async function handleOpenNewBudgetLine(areaId: string) {
    const names = await getDistinctBudgetLineNames()
    setExistingBLNames(names)
    setNewBLAreaId(areaId)
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
      area_id: newBLAreaId,
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

    // Reload budget lines for this area
    const updatedLines = await getBudgetLines(newBLAreaId)
    setBudgetLinesByArea((prev) => ({ ...prev, [newBLAreaId]: updatedLines }))
  }

  async function handleSubmit() {
    if (Math.abs(remaining) > 0.01) {
      toast.error('A soma das alocações deve ser igual ao valor do depósito')
      return
    }

    // Check that all allocations have a budget line
    const entries = Object.entries(allocations).filter(
      ([, val]) => parseFloat(val) > 0
    )
    if (entries.length === 0) {
      toast.error('Informe pelo menos uma alocação')
      return
    }

    setLoading(true)

    const payload = {
      card_id: cardId,
      amount: parsedAmount,
      reference_month: referenceMonth,
      description: description || undefined,
      allocations: entries.map(([key, val]) => {
        const { areaId, blId } = parseKey(key)
        return {
          area_id: areaId,
          budget_line_id: blId,
          amount: parseFloat(val),
        }
      }),
    }

    const result = isEditing
      ? await updateDepositWithAllocations(deposit.id, payload)
      : await createDepositWithAllocations(payload)

    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(isEditing ? 'Depósito atualizado com sucesso!' : 'Depósito criado com sucesso!')
    router.push('/depositos')
  }

  // Check if any area has no budget lines
  const areasWithoutBudgetLines = filteredAreas.filter(
    (area) => (budgetLinesByArea[area.id] || []).length === 0
  )

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={step === 1 ? 'default' : 'outline'}>1. Depósito</Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant={step === 2 ? 'default' : 'outline'}>2. Alocação por Rubrica</Badge>
        </div>
        <CardTitle>
          {step === 1 ? 'Dados do Depósito' : 'Distribuir por Rubricas'}
        </CardTitle>
        <CardDescription>
          {step === 1
            ? 'Informe o cartão, valor e mês de referência'
            : 'Distribua o valor entre as rubricas de cada área. A soma deve bater com o depósito.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {step === 1 && (
          <>
            <div className="space-y-2">
              <Label>Cartão</Label>
              <Select value={cardId} onValueChange={setCardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cartão" />
                </SelectTrigger>
                <SelectContent>
                  {cards.filter((c) => c.is_active).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.bank} •••• {c.last_four_digits})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor do depósito (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="1000.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
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
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Ex: Depósito mensal"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex items-center justify-between p-3 rounded-md bg-muted">
              <span className="text-sm font-medium">Valor do depósito:</span>
              <span className="font-bold">{formatCurrency(parsedAmount)}</span>
            </div>

            {loadingBudgetLines ? (
              <p className="text-sm text-muted-foreground">Carregando rubricas...</p>
            ) : (
              <div className="space-y-6">
                {filteredAreas.map((area) => {
                  const lines = budgetLinesByArea[area.id] || []
                  const areaTotal = getAreaTotal(area.id)

                  return (
                    <div key={area.id} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full shrink-0"
                            style={{ backgroundColor: area.color }}
                          />
                          <span className="font-medium">{area.name}</span>
                          {areaTotal > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {formatCurrency(areaTotal)}
                            </Badge>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenNewBudgetLine(area.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Nova Rubrica
                        </Button>
                      </div>

                      {lines.length > 0 ? (
                        <div className="space-y-2 pl-6">
                          {lines.map((bl) => {
                            const key = makeKey(area.id, bl.id)
                            return (
                              <div key={bl.id} className="flex items-center gap-3">
                                <Label className="w-40 shrink-0 text-sm">{bl.name}</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={allocations[key] || ''}
                                  onChange={(e) => handleAllocationChange(key, e.target.value)}
                                  className="w-40"
                                />
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-amber-600 pl-6">
                          Esta área não possui rubricas cadastradas. Use o botão acima para criar uma.
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className={`flex items-center justify-between p-3 rounded-md ${
              Math.abs(remaining) < 0.01
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              <span className="text-sm font-medium">Restante para alocar:</span>
              <span className="font-bold">{formatCurrency(remaining)}</span>
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        {step === 1 ? (
          <>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!canProceed()}
              onClick={() => setStep(2)}
            >
              Próximo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button
              type="button"
              disabled={loading || Math.abs(remaining) > 0.01}
              onClick={handleSubmit}
            >
              {loading ? 'Salvando...' : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {isEditing ? 'Salvar Alterações' : 'Confirmar Depósito'}
                </>
              )}
            </Button>
          </>
        )}
      </CardFooter>
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
