import { logger } from './logger.js'

/**
 * Клиент для Unisender Go — отдельного сервиса транзакционных писем.
 * Документация: https://godocs.unisender.ru/web-api-ref
 *
 * Не путать с классическим Unisender (api.unisender.com) — это другой продукт
 * с другим API и другим личным кабинетом.
 */

// ─── Типы ────────────────────────────────────────────────

export type SendEmailParams = {
  to: string                  // email получателя
  subject: string
  html: string                // тело письма в HTML
  toName?: string             // имя получателя
  replyTo?: string            // адрес для ответа
}

type SendResponse = {
  status?: 'success' | 'error'
  job_id?: string
  emails?: string[]
  failed_emails?: Record<string, string>
  message?: string
  code?: number
}

// ─── Конфигурация ────────────────────────────────────────

const API_BASE = 'https://goapi.unisender.ru/ru/transactional/api/v1'

function getConfig() {
  const apiKey = process.env.UNISENDER_GO_KEY
  const senderEmail = process.env.UNISENDER_SENDER_EMAIL
  const senderName = process.env.UNISENDER_SENDER_NAME || 'Businitti'

  if (!apiKey) throw new Error('UNISENDER_GO_KEY обязателен в .env')
  if (!senderEmail) throw new Error('UNISENDER_SENDER_EMAIL обязателен в .env (подтверждённый адрес в Unisender Go)')

  return { apiKey, senderEmail, senderName }
}

// ─── Отправка письма ────────────────────────────────────

/**
 * Отправляет одиночное транзакционное письмо через Unisender Go.
 * Бесплатный тариф: 1500 писем/мес на 100 контактов.
 */
export async function sendEmail(params: SendEmailParams): Promise<{ jobId?: string }> {
  const { apiKey, senderEmail, senderName } = getConfig()

  const payload: Record<string, any> = {
    message: {
      recipients: [
        {
          email: params.to,
          ...(params.toName ? { substitutions: { to_name: params.toName } } : {}),
        },
      ],
      body: {
        html: params.html,
      },
      subject: params.subject,
      from_email: senderEmail,
      from_name: senderName,
      ...(params.replyTo ? { reply_to: params.replyTo } : {}),
    },
  }

  const res = await fetch(`${API_BASE}/email/send.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify(payload),
  })

  const data = (await res.json().catch(() => ({}))) as SendResponse

  if (!res.ok || data.status === 'error') {
    logger.error({ to: params.to, status: res.status, response: data }, 'Unisender Go: ошибка отправки')
    throw new Error(`Unisender Go sendEmail failed (HTTP ${res.status}): ${data.message || 'unknown'} ${data.code ? `[${data.code}]` : ''}`)
  }

  if (data.failed_emails && Object.keys(data.failed_emails).length > 0) {
    logger.error({ to: params.to, failed: data.failed_emails }, 'Unisender Go: failed_emails в ответе')
    const reasons = Object.entries(data.failed_emails).map(([email, reason]) => `${email}: ${reason}`).join('; ')
    throw new Error(`Unisender Go failed_emails: ${reasons}`)
  }

  logger.info({ to: params.to, jobId: data.job_id }, 'Unisender Go: письмо принято в отправку')
  return { jobId: data.job_id }
}
