import { Router, Request, Response } from 'express'
import { createPaymentUrl, createPaymentForm, verifyResultSignature, verifySuccessSignature, buildReceipt } from '../robokassa.js'
import { findOrderByInvId, fetchOrderWithItems, fetchOrderItems, updateOrderStatus, decrementStockForOrder, updateOrderEmailStatus, getAuth, DELIVERY_LABELS, type OrderItem } from '../orders-utils.js'
import { paymentPageLimiter } from '../rate-limit.js'
import { sendPurchaseConversion } from '../analytics-conversions.js'
import { notifyTelegramOrder } from '../telegram-notify.js'
import { sendEmail } from '../unisender.js'
import { buildOrderEmailHtml, buildOrderEmailSubject } from '../order-email.js'
import { fetchOverridesMap } from '../site-content-utils.js'
import { logger } from '../logger.js'

const router = Router()

/**
 * POST /api/payment/create
 * Создаёт ссылку на оплату.
 *
 * Body: { outSum, invId?, description?, email?, items?: [{name, quantity, price}], shpParams? }
 */
router.post('/create', (req: Request, res: Response) => {
  try {
    const { outSum, invId, description, email, items, shpParams } = req.body

    if (!outSum || typeof outSum !== 'number' || outSum <= 0) {
      res.status(400).json({ error: 'outSum обязателен и должен быть > 0' })
      return
    }

    // Формируем чек если переданы товары
    const receipt = items?.length ? buildReceipt(items) : undefined

    const result = createPaymentUrl({
      outSum,
      invId,
      description,
      email,
      receipt,
      shpParams,
    })

    res.json(result)
  } catch (err: any) {
    logger.error({ err: err.message }, 'ошибка создания платежа')
    res.status(500).json({ error: 'Ошибка создания платежа' })
  }
})

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** Минимальная страница-заглушка с сообщением покупателю */
function infoPage(title: string, text: string, link?: { href: string; label: string }): string {
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#2F2F2F;background:#FAF8F5;padding:24px}
.card{max-width:420px;text-align:center}h1{font-size:20px;font-weight:600;margin:0 0 12px}
a{display:inline-block;margin-top:20px;padding:12px 24px;background:#2F2F2F;color:#fff;border-radius:8px;text-decoration:none}</style>
</head><body><div class="card"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(text)}</p>${
    link ? `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>` : ''
  }</div></body></html>`
}

/**
 * GET /api/payment/pay/:invId
 * Страница перехода к оплате: сабмитит параметры в Робокассу POST-формой.
 *
 * Зачем не прямая ссылка: у Робокассы query ограничен ~2048 символами, а чек занимает
 * ~280 символов на позицию — корзина от 6 товаров превращалась в 404 вместо оплаты.
 * Тело POST такого ограничения не имеет.
 *
 * Ссылка постоянная и привязана к заказу — её можно открыть повторно или отправить
 * покупателю, который не довёл оплату до конца.
 */
router.get('/pay/:invId', paymentPageLimiter, async (req: Request, res: Response) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  try {
    const invId = Number(req.params.invId)
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!Number.isFinite(invId) || invId <= 0 || !sheetId) {
      return res.status(400).send(infoPage('Ссылка не работает', 'Проверьте адрес или оформите заказ заново.',
        { href: frontendUrl, label: 'В магазин' }))
    }

    const auth = getAuth()
    const order = await findOrderByInvId(auth, sheetId, invId)
    if (!order) {
      return res.status(404).send(infoPage('Заказ не найден', 'Возможно, ссылка устарела.',
        { href: frontendUrl, label: 'В магазин' }))
    }
    if (order.status === 'cancelled' || order.status === 'refunded') {
      return res.status(410).send(infoPage('Заказ отменён', 'Этот заказ больше нельзя оплатить.',
        { href: frontendUrl, label: 'В магазин' }))
    }
    if (order.status !== 'pending_payment') {
      // уже оплачен — не даём заплатить второй раз
      return res.redirect(`${frontendUrl}/payment/success?invId=${invId}`)
    }

    const items = await fetchOrderItems(auth, sheetId, order.id)
    if (items.length === 0) {
      logger.error({ orderId: order.id, invId }, 'у заказа нет позиций — нечего оплачивать')
      return res.status(500).send(infoPage('Не удалось открыть оплату', 'Напишите нам, и мы поможем завершить заказ.',
        { href: frontendUrl, label: 'В магазин' }))
    }

    const receipt = buildReceipt(
      items.map((it) => ({ name: it.product_title, quantity: it.quantity, price: it.price_rub })),
      order.delivery_rub > 0
        ? { name: DELIVERY_LABELS[order.delivery_service] || 'Доставка', price: order.delivery_rub }
        : undefined
    )

    const form = createPaymentForm({
      outSum: order.total_rub,
      invId: order.inv_id,
      description: `Заказ #${order.display_id}`,
      email: order.customer_email,
      receipt,
    })

    const inputs = Object.entries(form.fields)
      .map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`)
      .join('\n    ')

    // автосабмит; кнопка остаётся видимой запасным вариантом, если скрипт не отработал
    res.set('Cache-Control', 'no-store').send(`<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>Переход к оплате</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#2F2F2F;background:#FAF8F5;padding:24px}
.card{max-width:420px;text-align:center}p{margin:0 0 20px}
button{padding:12px 24px;background:#2F2F2F;color:#fff;border:0;border-radius:8px;font-size:16px;cursor:pointer}</style>
</head><body>
  <div class="card">
    <p>Открываем защищённую страницу оплаты Робокассы…</p>
    <form id="pay" method="POST" action="${escapeHtml(form.actionUrl)}" accept-charset="utf-8">
    ${inputs}
      <button type="submit">Перейти к оплате</button>
    </form>
  </div>
  <script>document.getElementById('pay').submit()</script>
</body></html>`)
  } catch (err: any) {
    logger.error({ err: err?.message, invId: req.params.invId }, 'ошибка страницы перехода к оплате')
    res.status(500).send(infoPage('Не удалось открыть оплату', 'Попробуйте ещё раз через минуту.',
      { href: frontendUrl, label: 'В магазин' }))
  }
})

/**
 * POST /api/payment/result
 * Result URL — серверное уведомление от Робокассы об успешной оплате.
 * Робокасса ожидает ответ OK{InvId}
 */
router.post('/result', async (req: Request, res: Response) => {
  try {
    const { OutSum, InvId, SignatureValue, ...rest } = req.body

    if (!OutSum || !InvId || !SignatureValue) {
      logger.warn({ body: req.body }, 'Result URL: отсутствуют обязательные параметры')
      res.status(400).send('bad request')
      return
    }

    // Собираем Shp_ параметры
    const shpParams: Record<string, string> = {}
    for (const [key, value] of Object.entries(rest)) {
      if (key.startsWith('Shp_') || key.startsWith('shp_')) {
        shpParams[key] = String(value)
      }
    }

    const isValid = verifyResultSignature(
      String(OutSum),
      String(InvId),
      String(SignatureValue),
      Object.keys(shpParams).length > 0 ? shpParams : undefined
    )

    if (!isValid) {
      logger.warn({ InvId, OutSum }, 'Result URL: невалидная подпись')
      res.status(400).send('bad sign')
      return
    }

    // Отвечаем Робокассе немедленно — она ждёт не более ~10 сек
    // Все операции с Google Sheets и отправка письма выполняются в фоне
    res.send(`OK${InvId}`)
    logger.info({ InvId, OutSum }, 'оплата подтверждена Робокассой')

    // Фоновая обработка
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) return

    setImmediate(async () => {
      try {
        const auth = getAuth()
        const invIdNum = Number(InvId)
        const order = await findOrderByInvId(auth, sheetId, invIdNum)
        if (!order) {
          logger.warn({ InvId }, 'заказ по inv_id не найден')
          return
        }
        if (order.status !== 'pending_payment') {
          logger.warn({ orderId: order.id, status: order.status, InvId }, 'заказ уже не в pending_payment, статус не меняем')
          return
        }

        // Defense in depth: сверяем сумму платежа с total_rub заказа (подпись Робокассы это и так гарантирует, но лишним не будет)
        const paidSum = Number(OutSum)
        if (!Number.isFinite(paidSum) || Math.abs(paidSum - order.total_rub) > 0.01) {
          logger.error({ orderId: order.id, expected: order.total_rub, got: paidSum, InvId }, 'сумма платежа не совпадает с total_rub — статус не меняем')
          return
        }

        await updateOrderStatus(auth, sheetId, order.id, 'new')
        logger.info({ orderId: order.id, InvId }, 'заказ переведён в new (оплачен)')

        // позиции нужны и уведомлению в Telegram, и разбивке purchase по товарам
        let items: OrderItem[] = []
        try {
          items = await fetchOrderItems(auth, sheetId, order.id)
        } catch (itemsErr: any) {
          logger.error({ err: itemsErr?.message, orderId: order.id }, 'не удалось загрузить позиции заказа')
        }

        // Уведомление владельцу — только здесь, по факту оплаты: заказ в pending_payment
        // готовить рано. Гард по статусу выше делает это ровно один раз на заказ.
        await notifyTelegramOrder(sheetId, { ...order, status: 'new' }, items)

        try {
          await decrementStockForOrder(auth, sheetId, order.id)
        } catch (stockErr: any) {
          logger.error({ err: stockErr?.message, orderId: order.id }, 'не удалось уменьшить stock')
        }

        // Покупка в Метрику/GA4 — только здесь, по факту оплаты.
        try {
          const convItems = items.map((it) => ({
            id: it.product_slug,
            name: it.product_title,
            price: it.price_rub,
            quantity: it.quantity,
          }))
          await sendPurchaseConversion({
            invId: invIdNum,
            revenue: order.total_rub,
            currency: 'RUB',
            metrikaClientId: order.metrika_client_id,
            gaClientId: order.ga_client_id,
            items: convItems,
          })
        } catch (convErr: any) {
          logger.error({ err: convErr?.message, orderId: order.id }, 'не удалось отправить конверсию в аналитику')
        }

        try {
          const full = await fetchOrderWithItems(auth, sheetId, order.id)
          if (full?.customer_email) {
            let emailOpts: { messengerLink?: string; supportPhone?: string } = {}
            try {
              const overrides = await fetchOverridesMap(sheetId)
              emailOpts = {
                messengerLink: overrides['links.messenger'] || undefined,
                supportPhone: overrides['links.phone'] || undefined,
              }
            } catch { /* fallback к env */ }
            await sendEmail({
              to: full.customer_email,
              toName: full.customer_name,
              subject: buildOrderEmailSubject(full),
              html: buildOrderEmailHtml(full, emailOpts),
              replyTo: process.env.SUPPORT_EMAIL,
            })
            await updateOrderEmailStatus(auth, sheetId, order.id, true, '')
          }
        } catch (mailErr: any) {
          const errMsg = mailErr?.message || 'неизвестная ошибка'
          logger.error({ err: errMsg, orderId: order.id }, 'не удалось отправить письмо клиенту об оплате')
          try {
            await updateOrderEmailStatus(auth, sheetId, order.id, false, errMsg)
          } catch {/* ignore */}
        }
      } catch (e: any) {
        logger.error({ err: e?.message, InvId }, 'ошибка фоновой обработки платежа')
      }
    })
  } catch (err: any) {
    logger.error({ err: err.message }, 'ошибка обработки Result URL')
    res.status(500).send('internal error')
  }
})

/**
 * GET/POST /api/payment/success
 * Success URL — редирект покупателя после успешной оплаты.
 */
router.all('/success', (req: Request, res: Response) => {
  const params = { ...req.query, ...req.body }
  const { OutSum, InvId, SignatureValue } = params

  if (OutSum && InvId && SignatureValue) {
    const shpParams: Record<string, string> = {}
    for (const [key, value] of Object.entries(params)) {
      if (typeof key === 'string' && (key.startsWith('Shp_') || key.startsWith('shp_'))) {
        shpParams[key] = String(value)
      }
    }

    const isValid = verifySuccessSignature(
      String(OutSum),
      String(InvId),
      String(SignatureValue),
      Object.keys(shpParams).length > 0 ? shpParams : undefined
    )

    if (!isValid) {
      logger.warn({ InvId }, 'Success URL: невалидная подпись')
    }
  }

  // Редирект на фронтенд (страницу успешной оплаты)
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  res.redirect(`${frontendUrl}/payment/success?invId=${InvId || ''}`)
})

/**
 * GET/POST /api/payment/fail
 * Fail URL — редирект покупателя после неудачной оплаты.
 */
router.all('/fail', (req: Request, res: Response) => {
  const params = { ...req.query, ...req.body }
  const { InvId } = params

  logger.info({ InvId }, 'покупатель вернулся после неудачной оплаты')

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  res.redirect(`${frontendUrl}/payment/fail?invId=${InvId || ''}`)
})

export default router
