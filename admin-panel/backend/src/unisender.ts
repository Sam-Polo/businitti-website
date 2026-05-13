import { logger } from './logger.js'

export type SendEmailParams = {
  to: string
  subject: string
  html: string
  toName?: string
  replyTo?: string
}

const API_URL = 'https://api.rusender.ru/api/v1/external-mails/send'

function getConfig() {
  const apiKey = process.env.RUSENDER_API_KEY
  const senderEmail = process.env.RUSENDER_EMAIL
  const senderName = process.env.RUSENDER_SENDER_NAME || 'Businitti'

  if (!apiKey) throw new Error('RUSENDER_API_KEY обязателен в .env')
  if (!senderEmail) throw new Error('RUSENDER_EMAIL обязателен в .env')

  return { apiKey, senderEmail, senderName }
}

export async function sendEmail(params: SendEmailParams): Promise<{ jobId?: string }> {
  const { apiKey, senderEmail, senderName } = getConfig()

  const payload = {
    mail: {
      to: { email: params.to, ...(params.toName ? { name: params.toName } : {}) },
      from: { email: senderEmail, name: senderName },
      subject: params.subject,
      html: params.html,
    },
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json().catch(() => ({})) as Record<string, any>

  if (!res.ok) {
    logger.error({ to: params.to, status: res.status, response: data }, 'RuSender: ошибка отправки')
    throw new Error(`RuSender sendEmail failed (HTTP ${res.status}): ${data.message || JSON.stringify(data)}`)
  }

  logger.info({ to: params.to, id: data.id }, 'RuSender: письмо принято в отправку')
  return { jobId: data.id }
}
