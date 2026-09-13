import { getOrderInvoice } from '@/actions/dashboard'
import { OrderDocumentView } from '@/components/dashboard/order-document-view'
import { redirect } from 'next/navigation'

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = await params
  const result = await getOrderInvoice(orderId)

  if (!result.success || !result.data) {
    redirect('/dashboard/purchases')
  }

  return <OrderDocumentView data={result.data} variant="invoice" />
}
