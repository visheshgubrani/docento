import { getOrderReceipt } from '@/actions/dashboard'
import { OrderDocumentView } from '@/components/dashboard/order-document-view'
import { redirect } from 'next/navigation'

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = await params
  const result = await getOrderReceipt(orderId)

  if (!result.success || !result.data) {
    redirect('/dashboard/purchases')
  }

  return <OrderDocumentView data={result.data} variant="receipt" />
}
