type ExcelRow = Record<string, string | number | boolean | null | undefined>

type DownloadExcelOptions = {
  filename: string
  sheetName?: string
  rows: ExcelRow[]
}

export async function downloadExcelFile({
  filename,
  sheetName = 'Report',
  rows,
}: DownloadExcelOptions) {
  const xlsx = await import('xlsx')
  const worksheet = xlsx.utils.json_to_sheet(rows)
  const workbook = xlsx.utils.book_new()

  xlsx.utils.book_append_sheet(workbook, worksheet, sheetName)
  xlsx.writeFileXLSX(
    workbook,
    filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  )
}

export type { ExcelRow }
