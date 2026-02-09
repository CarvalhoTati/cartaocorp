'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createExpense, getAvailableBalance } from '@/actions/expenses'
import { formatCurrency, getMonthOptions } from '@/lib/utils'
import type { Card as CardType, Area } from '@/types/database'

interface ExpenseFormProps {
  cards: CardType[]
  areas: Area[]
}

export function ExpenseForm({ cards, areas }: ExpenseFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [cardId, setCardId] = useState('')
  const [areaId, setAreaId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [referenceMonth, setReferenceMonth] = useState(getMonthOptions()[0].value)
  const [availableBalance, setAvailableBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)

  const monthOptions = getMonthOptions()
  const parsedAmount = parseFloat(amount) || 0
  const exceedsBalance = availableBalance !== null && parsedAmount > availableBalance

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (exceedsBalance) {
      toast.error('Valor excede o saldo disponível')
      return
    }

    setLoading(true)
    const result = await createExpense({
      card_id: cardId,
      area_id: areaId,
      amount: parsedAmount,
      description,
      expense_date: expenseDate,
      reference_month: referenceMonth,
    })

    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success('Despesa registrada!')
    router.push('/despesas')
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Nova Despesa</CardTitle>
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
              <Select value={areaId} onValueChange={setAreaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a área" />
                </SelectTrigger>
                <SelectContent>
                  {areas.filter((a) => a.is_active).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: a.color }} />
                        {a.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <Button type="submit" disabled={loading || exceedsBalance || !cardId || !areaId}>
            {loading ? 'Salvando...' : 'Registrar Despesa'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
