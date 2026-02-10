'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/layout/confirm-dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { deleteExpense } from '@/actions/expenses'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ExpenseListProps {
  expenses: any[]
  isAdmin: boolean
}

export function ExpenseList({ expenses, isAdmin }: ExpenseListProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!deleteId) return
    setLoading(true)
    const result = await deleteExpense(deleteId)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Despesa excluída')
      router.refresh()
    }
    setDeleteId(null)
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Cartão</TableHead>
            <TableHead>Área</TableHead>
            <TableHead>Rubrica</TableHead>
            <TableHead>Criado por</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            {isAdmin && <TableHead className="w-20" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((exp: any) => (
            <TableRow key={exp.id}>
              <TableCell className="whitespace-nowrap">{formatDate(exp.expense_date)}</TableCell>
              <TableCell>{exp.description}</TableCell>
              <TableCell>
                {exp.card?.name} •••• {exp.card?.last_four_digits}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: exp.area?.color }} />
                  {exp.area?.name}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{exp.budget_line?.name || '-'}</TableCell>
              <TableCell>{exp.profile?.full_name || '-'}</TableCell>
              <TableCell className="text-right font-medium text-red-600">
                {formatCurrency(exp.amount)}
              </TableCell>
              {isAdmin && (
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      asChild
                    >
                      <Link href={`/despesas/${exp.id}/editar`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(exp.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir despesa"
        description="Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        loading={loading}
      />
    </>
  )
}
