import { logger } from './logger.js'

// ─── Типы ────────────────────────────────────────────────

export type SendEmailParams = {
  to: string                  // email получателя
  subject: string
  html: string                // тело письма в HTML
  toName?: string             // имя получателя
  replyTo?: string            // адрес для ответа
}

type UnisenderListsResponse = {
  result?: Array<{ id: number; title: string }>
  error?: string
  code?: string
}

type UnisenderSendEmailResponse = {
  result?: { index: number; id?: string; email?: string; errors?: any[] }
  error?: string
  code?: string
  warnings?: any[]
}

// ─── Конфигурация ────────────────────────────────────────

const API_BASE = 'https://api.unisender.com/ru/api'

function getConfig() {
  const apiKey = process.env.UNISENDER_API_KEY
  const senderEmail = process.env.UNISENDER_SENDER_EMAIL
  const senderName = process.env.UNISENDER_SENDER_NAME || 'Businitti'

  if (!apiKey) throw new Error('UNISENDER_API_KEY обязателен в .env')
  if (!senderEmail) throw new Error('UNISENDER_SENDER_EMAIL обязателен в .env (подтверждённый адрес в Unisender)')

  return { apiKey, senderEmail, senderName }
}

// ─── Низкоуровневый HTTP ────────────────────────────────

async function callApi<T>(method: string, params: Record<string, string>): Promise<T> {
  const { apiKey } = getConfig()
  const body = new URLSearchParams({
    format: 'json',
    api_key: apiKey,
    ...params,
  })

  const url = `${API_BASE}/${method}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    throw new Error(`Unisender HTTP ${res.status}: ${await res.text().catch(() => '')}`)
  }

  const data = (await res.json()) as T
  return data
}

// ─── Получение list_id (кэшируется в памяти процесса) ────

let cachedListId: number | null = null

/**
 * Возвращает id дефолтного списка (на бесплатном тарифе он один при регистрации).
 * Параметр list_id обязателен в sendEmail для функционала отписки.
 */
export async function getDefaultListId(): Promise<number> {
  if (cachedListId !== null) return cachedListId

  // Если list_id указан в .env — используем его без обращения к API
  const fromEnv = process.env.UNISENDER_LIST_ID
  if (fromEnv) {
    const parsed = parseInt(fromEnv, 10)
    if (Number.isFinite(parsed) && parsed > 0) {
      cachedListId = parsed
      return parsed
    }
  }

  const data = await callApi<UnisenderListsResponse>('getLists', {})
  if (data.error || !data.result || data.result.length === 0) {
    throw new Error(`Unisender getLists failed: ${data.error || 'no lists in account'}`)
  }

  cachedListId = data.result[0].id
  logger.info({ listId: cachedListId, title: data.result[0].title }, 'Unisender: используется список')
  return cachedListId
}

// ─── Отправка письма ────────────────────────────────────

/**
 * Отправляет одиночное транзакционное письмо через метод sendEmail.
 * Ограничения: 1000 писем/день для новых аккаунтов, 60 запросов/мин,
 * минимум 60 сек между письмами одному получателю.
 */
export async function sendEmail(params: SendEmailParams): Promise<{ id?: string }> {
  const { senderEmail, senderName } = getConfig()
  const listId = await getDefaultListId()

  const to = params.toName ? `${params.toName} <${params.to}>` : params.to

  // Reply-To передаётся через параметр headers в MIME-формате
  const headers = params.replyTo ? `Reply-To: ${params.replyTo}` : undefined

  const requestParams: Record<string, string> = {
    email: to,
    sender_name: senderName,
    sender_email: senderEmail,
    subject: params.subject,
    body: params.html,
    list_id: String(listId),
    lang: 'ru',
    error_checking: '1',
  }
  if (headers) requestParams.headers = headers

  const data = await callApi<UnisenderSendEmailResponse>('sendEmail', requestParams)

  if (data.error) {
    logger.error({ to: params.to, error: data.error, code: data.code }, 'Unisender: ошибка отправки')
    throw new Error(`Unisender sendEmail failed: ${data.error} (${data.code || 'unknown'})`)
  }

  const errors = data.result?.errors
  if (Array.isArray(errors) && errors.length > 0) {
    logger.error({ to: params.to, errors }, 'Unisender: ошибки в result')
    throw new Error(`Unisender sendEmail errors: ${JSON.stringify(errors)}`)
  }

  logger.info({ to: params.to, id: data.result?.id }, 'Unisender: письмо отправлено')
  return { id: data.result?.id }
}
