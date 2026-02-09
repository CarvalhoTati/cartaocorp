'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { getMonthOptions } from '@/lib/utils'
import type { Card, Area } from '@/types/database'

interface ExpenseFiltersProps {
  cards: Card[]
  areas: Area[]
}

export function ExpenseFilters({ cards, areas }: ExpenseFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const monthOptions = getMonthOptions()

  const currentCard = searchParams.get('card_id') || ''
  const currentArea = searchParams.get('area_id') || ''
  const currentMonth = searchParams.get('month') || ''

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/despesas?${params.toString()}`)
  }

  function clearFilters() {
    router.push('/despesas')
  }

  const hasFilters = currentCard || currentArea || currentMonth

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={currentCard} onValueChange={(v) => updateFilter('card_id', v)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Todos os cartões" />
        </SelectTrigger>
        <SelectContent>
          {cards.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name} •••• {c.last_four_digits}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentArea} onValueChange={(v) => updateFilter('area_id', v)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Todas as áreas" />
        </SelectTrigger>
        <SelectContent>
          {areas.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: a.color }} />
                {a.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentMonth} onValueChange={(v) => updateFilter('month', v)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Todos os meses" />
        </SelectTrigger>
        <SelectContent>
          {monthOptions.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-4 w-4" />
          Limpar filtros
        </Button>
      )}
    </div>
  )
}
