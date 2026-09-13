// utils/webhook.ts
import crypto from 'crypto'
import axios from 'axios'
import { prisma } from '../lib/prisma'

export const dispatchWebhook = async (
  projectId: string,
  eventType: string,
  data: any
) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { webhookUrl: true, webhookSecret: true },
    })

    // 2. If not configured, stop
    if (!project || !project.webhookUrl || !project.webhookSecret) return

    // 3. Construct Payload
    const timestamp = Date.now()
    const payload = JSON.stringify({
      id: crypto.randomUUID(),
      event: eventType, // e.g. "enrollment.created"
      createdAt: new Date().toISOString(),
      data: data,
    })

    // 4. Generate Signature (Stripe Style)
    // This proves to Dave that YOU sent this, not a hacker.
    const signature = crypto
      .createHmac('sha256', project.webhookSecret)
      .update(`${timestamp}.${payload}`)
      .digest('hex')

    // 5. Fire and Forget (Don't await this in your main controller flow)
    axios
      .post(project.webhookUrl, JSON.parse(payload), {
        headers: {
          'Content-Type': 'application/json',
          'X-LMS-Signature': `t=${timestamp},v1=${signature}`,
          'User-Agent': 'LMS-Webhook/1.0',
        },
        timeout: 5000, // Don't hang forever
      })
      .catch((err) =>
        console.error(`Webhook failed for ${projectId}:`, err.message)
      )
  } catch (error) {
    console.error('Dispatch error:', error)
  }
}
