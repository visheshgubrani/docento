import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from '@react-pdf/renderer'

type PdfColumn = {
  key: string
  label: string
  weight?: number
  align?: 'left' | 'center' | 'right'
}

type PdfRow = Record<string, string | number | null | undefined>

type DownloadPdfReportOptions = {
  title: string
  subtitle?: string
  filename: string
  generatedAt?: string
  columns: PdfColumn[]
  rows: PdfRow[]
  emptyMessage?: string
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 24,
    fontSize: 10,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 10,
    color: '#4B5563',
    marginBottom: 4,
  },
  meta: {
    fontSize: 9,
    color: '#6B7280',
  },
  table: {
    display: 'flex',
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'solid',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderBottomStyle: 'solid',
  },
  headerRow: {
    backgroundColor: '#F3F4F6',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  cell: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    borderRightStyle: 'solid',
  },
  lastCell: {
    borderRightWidth: 0,
  },
  headerText: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#374151',
  },
  bodyText: {
    fontSize: 9,
    color: '#111827',
  },
  emptyState: {
    paddingVertical: 24,
    paddingHorizontal: 12,
    textAlign: 'center',
    color: '#6B7280',
  },
})

function formatCellValue(value: PdfRow[string]) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  return String(value)
}

function ReportDocument({
  title,
  subtitle,
  generatedAt,
  columns,
  rows,
  emptyMessage,
}: Omit<DownloadPdfReportOptions, 'filename'>) {
  return (
    <Document title={title}>
      <Page size='A4' orientation='landscape' style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <Text style={styles.meta}>Generated on {generatedAt}</Text>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]} fixed>
            {columns.map((column, index) => (
              <View
                key={column.key}
                style={
                  index === columns.length - 1
                    ? [styles.cell, { flex: column.weight ?? 1 }, styles.lastCell]
                    : [styles.cell, { flex: column.weight ?? 1 }]
                }
              >
                <Text
                  style={[
                    styles.headerText,
                    { textAlign: column.align ?? 'left' },
                  ]}
                >
                  {column.label}
                </Text>
              </View>
            ))}
          </View>

          {rows.length === 0 ? (
            <Text style={styles.emptyState}>
              {emptyMessage ?? 'No data available.'}
            </Text>
          ) : (
            rows.map((row, rowIndex) => (
              <View
                key={`row-${rowIndex}`}
                style={
                  rowIndex === rows.length - 1
                    ? [styles.row, styles.lastRow]
                    : styles.row
                }
                wrap={false}
              >
                {columns.map((column, columnIndex) => (
                  <View
                    key={column.key}
                    style={
                      columnIndex === columns.length - 1
                        ? [styles.cell, { flex: column.weight ?? 1 }, styles.lastCell]
                        : [styles.cell, { flex: column.weight ?? 1 }]
                    }
                  >
                    <Text
                      style={[
                        styles.bodyText,
                        { textAlign: column.align ?? 'left' },
                      ]}
                    >
                      {formatCellValue(row[column.key])}
                    </Text>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
      </Page>
    </Document>
  )
}

export async function downloadPdfReport({
  title,
  subtitle,
  filename,
  columns,
  rows,
  generatedAt = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date()),
  emptyMessage,
}: DownloadPdfReportOptions) {
  const blob = await pdf(
    <ReportDocument
      title={title}
      subtitle={subtitle}
      generatedAt={generatedAt}
      columns={columns}
      rows={rows}
      emptyMessage={emptyMessage}
    />
  ).toBlob()

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export type { PdfColumn, PdfRow }
