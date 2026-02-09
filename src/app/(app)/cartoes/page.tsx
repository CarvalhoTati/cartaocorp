import Link from 'next/link'
import { CreditCard, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/layout/empty-state'
import { formatCurrency } from '@/lib/utils'
import { getCardBalances } from '@/actions/cards'

export default async function CartoesPage() {
  const balances = await getCardBalances()

  return (
    <>
      <PageHeader title="Cartões" description="Gerencie seus cartões corporativos">
        <Link href="/cartoes/novo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Cartão
          </Button>
        </Link>
      </PageHeader>

      {balances.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Nenhum cartão cadastrado"
          description="Crie seu primeiro cartão corporativo para começar"
        >
          <Link href="/cartoes/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Criar Cartão
            </Button>
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {balances.map((card) => (
            <Link key={card.card_id} href={`/cartoes/${card.card_id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">{card.card_name}</CardTitle>
                  <Badge variant={card.is_active ? 'default' : 'secondary'}>
                    {card.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <CreditCard className="h-4 w-4" />
                    {card.bank} •••• {card.last_four_digits}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Depósitos</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(card.total_deposits)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Despesas</p>
                      <p className="font-semibold text-red-600">
                        {formatCurrency(card.total_expenses)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Saldo</p>
                      <p className="font-bold text-lg">
                        {formatCurrency(card.balance)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
