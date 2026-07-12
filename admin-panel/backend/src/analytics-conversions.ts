import { logger } from './logger.js'

// Серверная фиксация покупки (paid-only) в Яндекс.Метрику и GA4.
// Вызывается из webhook Робокассы ПОСЛЕ подтверждения оплаты — ровно один раз
// на заказ (гард по статусу pending_payment в самом webhook). Так покупка
// считается только по реальной оплате и не зависит от того, вернулся ли
// покупатель с платёжной страницы на сайт.
//
// Best-effort: любая ошибка логируется и НЕ влияет на обработку заказа.
// Если переменные окружения не заданы — соответствующий канал молча пропускается.

export type PurchaseConversion = {
  invId: number
  revenue: number
  currency?: string // ISO 4217, по умолчанию RUB
  metrikaClientId?: string
  gaClientId?: string
  items?: Array<{ id: string; name: string; price: number; quantity: number }>
}

const METRIKA_API_BASE = process.env.METRIKA_API_BASE || 'https://api-metrika.yandex.net'
const GA4_MP_BASE = process.env.GA4_MP_BASE || 'https://www.google-analytics.com'

/**
 * Офлайн-конверсия в Метрику по ClientID.
 * Нужен OAuth-токен Яндекса со scope metrika:write. Цель (Target) должна быть
 * заведена в счётчике как JS-событие с этим идентификатором (по умолчанию purchase).
 */
async function sendMetrika(c: PurchaseConversion): Promise<void> {
  const token = process.env.YANDEX_METRIKA_OAUTH_TOKEN
  const counterId = process.env.YANDEX_METRIKA_COUNTER_ID
  const goal = process.env.METRIKA_PURCHASE_GOAL || 'purchase'
  if (!token || !counterId) return // не настроено
  if (!c.metrikaClientId) {
    logger.warn({ invId: c.invId }, 'metrika: у заказа нет ClientID — офлайн-конверсию не шлём')
    return
  }

  const dt = Math.floor(Date.now() / 1000)
  const price = Math.round(c.revenue)
  const currency = c.currency || 'RUB'
  const csv =
    'ClientId,Target,DateTime,Price,Currency\n' +
    `${c.metrikaClientId},${goal},${dt},${price},${currency}\n`

  const form = new FormData()
  form.append('file', new Blob([csv], { type: 'text/csv' }), 'conversions.csv')

  const url = `${METRIKA_API_BASE}/management/v1/counter/${counterId}/offline_conversions/upload?client_id_type=CLIENT_ID`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `OAuth ${token}` },
    body: form,
  })
  const data = (await res.json().catch(() => ({}))) as { uploading?: { id?: unknown } }
  if (!res.ok) {
    logger.error({ invId: c.invId, status: res.status, response: data }, 'metrika: офлайн-конверсия отклонена')
    return
  }
  logger.info({ invId: c.invId, uploadingId: data?.uploading?.id }, 'metrika: офлайн-конверсия purchase принята')
}

/** Событие purchase в GA4 через Measurement Protocol (нужны measurement_id + api_secret). */
async function sendGa4(c: PurchaseConversion): Promise<void> {
  const mid = process.env.GA4_MEASUREMENT_ID
  const secret = process.env.GA4_API_SECRET
  if (!mid || !secret) return // не настроено
  if (!c.gaClientId) {
    logger.warn({ invId: c.invId }, 'ga4: у заказа нет client_id — MP-событие не шлём')
    return
  }

  const body = {
    client_id: c.gaClientId,
    events: [
      {
        name: 'purchase',
        params: {
          transaction_id: String(c.invId),
          currency: c.currency || 'RUB',
          value: c.revenue,
          items: (c.items || []).map((it) => ({
            item_id: it.id,
            item_name: it.name,
            price: it.price,
            quantity: it.quantity,
          })),
        },
      },
    ],
  }

  const url = `${GA4_MP_BASE}/mp/collect?measurement_id=${encodeURIComponent(mid)}&api_secret=${encodeURIComponent(secret)}`
  const res = await fetch(url, { method: 'POST', body: JSON.stringify(body) })
  if (!res.ok) {
    logger.error({ invId: c.invId, status: res.status }, 'ga4: MP-событие purchase отклонено')
    return
  }
  logger.info({ invId: c.invId }, 'ga4: MP-событие purchase отправлено')
}

/** Отправляет покупку в Метрику и GA4. Никогда не бросает исключение. */
export async function sendPurchaseConversion(c: PurchaseConversion): Promise<void> {
  const results = await Promise.allSettled([sendMetrika(c), sendGa4(c)])
  for (const r of results) {
    if (r.status === 'rejected') {
      logger.error({ invId: c.invId, err: r.reason?.message || String(r.reason) }, 'conversion: ошибка отправки')
    }
  }
}
