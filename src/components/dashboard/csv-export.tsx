'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface CSVExportProps {
  data: any[]
  filename: string
  headers: { key: string; label: string }[]
}

export function CSVExport({ data, filename, headers }: CSVExportProps) {
  function handleExport() {
    const csvHeaders = headers.map((h) => h.label).join(';')
    const csvRows = data.map((row) =>
      headers
        .map((h) => {
          const value = h.key.split('.').reduce((obj, key) => obj?.[key], row)
          const str = String(value ?? '')
          return str.includes(';') || str.includes('"')
            ? `"${str.replace(/"/g, '""')}"`
            : str
        })
        .join(';')
    )
    const csv = [csvHeaders, ...csvRows].join('\n')
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={data.length === 0}>
      <Download className="mr-2 h-4 w-4" />
      Exportar CSV
    </Button>
  )
}
