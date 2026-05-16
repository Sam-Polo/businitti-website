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

// Расшифровка HTTP-кодов RuSender в понятный для админа текст
function describeRuSenderError(status: number, data: Record<string, any>): string {
  const apiMessage = data?.message ? String(data.message) : ''
  switch (status) {
    case 401:
      return 'Неверный API-ключ RuSender (проверьте RUSENDER_API_KEY в .env)'
    case 402:
      return 'Достигнут лимит тарифа RuSender — пополните баланс или продлите тариф'
    case 422:
      return `Получатель недоступен: ${apiMessage || 'адрес отписан или невалиден'}`
    case 429:
      return 'Слишком много запросов к RuSender — попробуйте через минуту'
    case 500:
    case 502:
    case 503:
      return 'Сервер RuSender временно недоступен'
    default:
      return apiMessage || `RuSender вернул HTTP ${status}`
  }
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
    const human = describeRuSenderError(res.status, data)
    // Лимиты и проблемы с ключом — отдельная категория, чтобы было видно в grep по логам
    if (res.status === 402 || res.status === 401 || res.status === 429) {
      logger.error({ to: params.to, status: res.status, response: data }, `RuSender: ${human}`)
    } else {
      logger.error({ to: params.to, status: res.status, response: data }, 'RuSender: ошибка отправки')
    }
    throw new Error(human)
  }

  logger.info({ to: params.to, id: data.id }, 'RuSender: письмо принято в отправку')
  return { jobId: data.id }
}
