'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { createCard, updateCard, setCardAreas } from '@/actions/cards'
import type { Card as CardType, Area } from '@/types/database'

interface CardFormProps {
  card?: CardType
  areas?: Area[]
  linkedAreaIds?: string[]
}

export function CardForm({ card, areas = [], linkedAreaIds = [] }: CardFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(card?.name || '')
  const [lastFourDigits, setLastFourDigits] = useState(card?.last_four_digits || '')
  const [bank, setBank] = useState(card?.bank || '')
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>(linkedAreaIds)

  const activeAreas = areas.filter((a) => a.is_active)

  function toggleArea(areaId: string) {
    setSelectedAreaIds((prev) =>
      prev.includes(areaId)
        ? prev.filter((id) => id !== areaId)
        : [...prev, areaId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const formData = { name, last_four_digits: lastFourDigits, bank }
    const result = card
      ? await updateCard(card.id, formData)
      : await createCard(formData)

    if (result.error) {
      setLoading(false)
      toast.error(result.error)
      return
    }

    // Save card-area mapping (for edit mode, card.id exists; for create, we need the new id)
    if (card) {
      const mapResult = await setCardAreas(card.id, selectedAreaIds)
      if (mapResult.error) {
        setLoading(false)
        toast.error(mapResult.error)
        return
      }
    }

    setLoading(false)
    toast.success(card ? 'Cartão atualizado!' : 'Cartão criado!')
    router.push('/cartoes')
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>{card ? 'Editar Cartão' : 'Novo Cartão'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do cartão</Label>
            <Input
              id="name"
              placeholder="Ex: Cartão Principal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="digits">Últimos 4 dígitos</Label>
              <Input
                id="digits"
                placeholder="1234"
                maxLength={4}
                pattern="\d{4}"
                value={lastFourDigits}
                onChange={(e) => setLastFourDigits(e.target.value.replace(/\D/g, '').slice(0, 4))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank">Banco</Label>
              <Input
                id="bank"
                placeholder="Ex: Itaú"
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Card ↔ Area mapping */}
          {activeAreas.length > 0 && (
            <div className="space-y-2">
              <Label>Áreas vinculadas</Label>
              <p className="text-sm text-muted-foreground">
                Selecione as áreas permitidas para este cartão
              </p>
              <div className="space-y-2 rounded-md border p-3">
                {activeAreas.map((area) => (
                  <label
                    key={area.id}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedAreaIds.includes(area.id)}
                      onCheckedChange={() => toggleArea(area.id)}
                    />
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: area.color }}
                    />
                    <span className="text-sm">{area.name}</span>
                  </label>
                ))}
              </div>
              {!card && selectedAreaIds.length > 0 && (
                <p className="text-sm text-amber-600">
                  O vínculo de áreas será salvo ao editar o cartão após criá-lo.
                </p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
