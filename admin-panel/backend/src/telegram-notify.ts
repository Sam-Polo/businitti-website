import { fetchTelegramChatId } from './settings-utils.js'
import { logger } from './logger.js'

/**
 * Уведомление о заказе в Telegram — бот сам форматирует сообщение из order + items.
 *
 * Шлётся ТОЛЬКО по факту оплаты (из webhook'а Робокассы): заказ в `pending_payment`
 * ещё не заказ — покупатель мог не дойти до оплаты, готовить такой рано.
 *
 * Best-effort: ничего не бросает наружу, ошибки только в лог.
 */
export async function notifyTelegramOrder(
  sheetId: string,
  order: Record<string, unknown>,
  items: unknown[]
): Promise<void> {
  try {
    const chatId = await fetchTelegramChatId(sheetId)
    if (!chatId) return

    const botUrl = process.env.TG_BOT_URL || 'http://127.0.0.1:4002'
    const res = await fetch(`${botUrl}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, order, items }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      logger.warn({ status: res.status, orderId: order.id }, 'бот не принял уведомление о заказе')
    }
  } catch (err: any) {
    logger.warn({ err: err?.message, orderId: order.id }, 'telegram notification failed')
  }
}
