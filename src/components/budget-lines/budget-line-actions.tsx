'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/layout/confirm-dialog'
import { deleteBudgetLine } from '@/actions/budget-lines'

interface BudgetLineActionsProps {
  areaId: string
  lineId: string
}

export function BudgetLineActions({ areaId, lineId }: BudgetLineActionsProps) {
  const router = useRouter()
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteBudgetLine(lineId)
    setDeleting(false)

    if (result.error) {
      toast.error(result.error)
      setShowDelete(false)
      return
    }

    toast.success('Rubrica excluída com sucesso!')
    setShowDelete(false)
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Link href={`/areas/${areaId}/rubricas/${lineId}/editar`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-4 w-4" />
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => setShowDelete(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Excluir Rubrica"
        description="Tem certeza que deseja excluir esta rubrica? Despesas vinculadas perderão a referência. Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  )
}
