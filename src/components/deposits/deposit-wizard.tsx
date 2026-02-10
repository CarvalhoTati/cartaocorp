'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, ArrowLeft, Check } from 'lucide-react'
import { createDepositWithAllocations, updateDepositWithAllocations } from '@/actions/deposits'
import { getAreasForCard } from '@/actions/areas'
import { formatCurrency, getMonthOptions } from '@/lib/utils'
import type { Card as CardType, Area } from '@/types/database'

interface DepositData {
  id: string
  card_id: string
  amount: number
  reference_month: string
  description: string | null
  allocations?: { id: string; area_id: string; amount: number }[]
}

interface DepositWizardProps {
  cards: CardType[]
  areas: Area[]
  deposit?: DepositData
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
      // Normalize to YYYY-MM-01 format
      const d = new Date(deposit.reference_month)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    }
    return getMonthOptions()[0].value
  })
  const [description, setDescription] = useState(deposit?.description || '')

  // Step 2 fields - pre-fill from existing allocations
  const [allocations, setAllocations] = useState<Record<string, string>>(() => {
    if (deposit?.allocations) {
      const alloc: Record<string, string> = {}
      deposit.allocations.forEach((a) => {
        alloc[a.area_id] = String(a.amount)
      })
      return alloc
    }
    return {}
  })

  const allActiveAreas = areas.filter((a) => a.is_active)
  const [filteredAreas, setFilteredAreas] = useState<Area[]>(allActiveAreas)
  const [loadingAreas, setLoadingAreas] = useState(false)
  const isFirstCardChange = useRef(true)

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
      }
    })
  }, [cardId])

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

  function handleAllocationChange(areaId: string, value: string) {
    setAllocations((prev) => ({ ...prev, [areaId]: value }))
  }

  function distributeEvenly() {
    if (filteredAreas.length === 0) return
    const perArea = Math.floor((parsedAmount / filteredAreas.length) * 100) / 100
    const diff = parsedAmount - perArea * filteredAreas.length
    const newAlloc: Record<string, string> = {}
    filteredAreas.forEach((a, i) => {
      const val = i === 0 ? perArea + Math.round(diff * 100) / 100 : perArea
      newAlloc[a.id] = val.toFixed(2)
    })
    setAllocations(newAlloc)
  }

  function canProceed() {
    return cardId && parsedAmount > 0 && referenceMonth
  }

  async function handleSubmit() {
    if (Math.abs(remaining) > 0.01) {
      toast.error('A soma das alocações deve ser igual ao valor do depósito')
      return
    }

    setLoading(true)

    const payload = {
      card_id: cardId,
      amount: parsedAmount,
      reference_month: referenceMonth,
      description: description || undefined,
      allocations: filteredAreas
        .filter((a) => parseFloat(allocations[a.id] || '0') > 0)
        .map((a) => ({
          area_id: a.id,
          amount: parseFloat(allocations[a.id] || '0'),
        })),
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={step === 1 ? 'default' : 'outline'}>1. Depósito</Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant={step === 2 ? 'default' : 'outline'}>2. Alocação</Badge>
        </div>
        <CardTitle>
          {step === 1 ? 'Dados do Depósito' : 'Distribuir por Áreas'}
        </CardTitle>
        <CardDescription>
          {step === 1
            ? 'Informe o cartão, valor e mês de referência'
            : 'Distribua o valor entre as áreas. A soma deve bater com o depósito.'}
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

            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={distributeEvenly}>
                Distribuir igualmente
              </Button>
            </div>

            <div className="space-y-3">
              {filteredAreas.map((area) => (
                <div key={area.id} className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: area.color }}
                  />
                  <Label className="w-32 shrink-0">{area.name}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={allocations[area.id] || ''}
                    onChange={(e) => handleAllocationChange(area.id, e.target.value)}
                    className="w-40"
                  />
                </div>
              ))}
            </div>

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
  )
}
