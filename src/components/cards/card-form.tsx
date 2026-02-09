'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { createCard, updateCard } from '@/actions/cards'
import type { Card as CardType } from '@/types/database'

interface CardFormProps {
  card?: CardType
}

export function CardForm({ card }: CardFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(card?.name || '')
  const [lastFourDigits, setLastFourDigits] = useState(card?.last_four_digits || '')
  const [bank, setBank] = useState(card?.bank || '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const formData = { name, last_four_digits: lastFourDigits, bank }
    const result = card
      ? await updateCard(card.id, formData)
      : await createCard(formData)

    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

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
