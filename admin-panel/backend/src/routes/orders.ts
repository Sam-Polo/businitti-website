import express from 'express'
import { requireAuth } from '../auth.js'
import { logger } from '../logger.js'
import {
  fetchOrders,
  fetchOrderWithItems,
  updateOrderStatus,
  updateOrderEmailStatus,
  shipOrder,
  deleteOrder,
  getAuth,
  type OrderStatus,
} from '../orders-utils.js'
import { sendEmail } from '../unisender.js'
import { buildOrderEmailHtml, buildOrderEmailSubject, buildShippingEmailHtml, buildShippingEmailSubject } from '../order-email.js'
import { fetchOverridesMap } from '../site-content-utils.js'

const router = express.Router()

router.use(requireAuth)

async function getEmailContactOptions(sheetId: string): Promise<{ messengerLink?: string; supportPhone?: string }> {
  try {
    const overrides = await fetchOverridesMap(sheetId)
    return {
      messengerLink: overrides['links.messenger'] || undefined,
      supportPhone: overrides['links.phone'] || undefined,
    }
  } catch {
    return {}
  }
}

const VALID_STATUSES: OrderStatus[] = ['pending_payment', 'new', 'shipped', 'cancelled', 'refunded']

function getSheetId(res: express.Response): string | null {
  const sheetId = process.env.GOOGLE_SHEET_ID
  if (!sheetId) {
    res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    return null
  }
  return sheetId
}

// GET /api/orders — список с опциональными фильтрами
router.get('/', async (req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const auth = getAuth()
    let orders = await fetchOrders(auth, sheetId)

    const status = typeof req.query.status === 'string' ? req.query.status.trim() : ''
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : ''
    const from = typeof req.query.from === 'string' ? req.query.from : ''
    const to = typeof req.query.to === 'string' ? req.query.to : ''

    if (status && status !== 'all') {
      orders = orders.filter((o) => o.status === status)
    }
    if (search) {
      orders = orders.filter((o) =>
        o.customer_name.toLowerCase().includes(search) ||
        o.customer_phone.toLowerCase().includes(search) ||
        o.customer_email.toLowerCase().includes(search) ||
        String(o.display_id).includes(search)
      )
    }
    if (from) orders = orders.filter((o) => o.created_at >= from)
    if (to) orders = orders.filter((o) => o.created_at <= to)

    res.json({ orders })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка загрузки заказов')
    res.status(500).json({ error: 'failed_to_load_orders' })
  }
})

// GET /api/orders/count — кол-во по статусу (для красной точки)
router.get('/count', async (req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const auth = getAuth()
    const orders = await fetchOrders(auth, sheetId)
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : 'new'
    const count = status === 'all' ? orders.length : orders.filter((o) => o.status === status).length
    res.json({ count })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка подсчёта заказов')
    res.status(500).json({ error: 'failed_to_count_orders' })
  }
})

// GET /api/orders/stats — статистика
router.get('/stats', async (req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const auth = getAuth()
    const orders = await fetchOrders(auth, sheetId)

    const period = typeof req.query.period === 'string' ? req.query.period : 'all'
    const now = new Date()
    let since: Date | null = null
    if (period === 'day') since = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    else if (period === 'week') since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    else if (period === 'month') since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const filtered = since
      ? orders.filter((o) => new Date(o.created_at) >= since!)
      : orders

    const byStatus: Record<OrderStatus, number> = {
      pending_payment: 0, new: 0, shipped: 0, cancelled: 0, refunded: 0,
    }
    for (const o of filtered) {
      if (o.status in byStatus) byStatus[o.status]++
    }

    const paid = filtered.filter((o) => o.status === 'new' || o.status === 'shipped')
    const revenue = paid.reduce((s, o) => s + (o.total_rub || 0), 0)
    const avgCheck = paid.length > 0 ? Math.round(revenue / paid.length) : 0

    res.json({
      period,
      total_orders: filtered.length,
      revenue,
      avg_check: avgCheck,
      by_status: byStatus,
    })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка статистики')
    res.status(500).json({ error: 'failed_to_load_stats' })
  }
})

// GET /api/orders/:id — детали заказа
router.get('/:id', async (req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const auth = getAuth()
    const order = await fetchOrderWithItems(auth, sheetId, req.params.id)
    if (!order) return res.status(404).json({ error: 'not_found' })
    res.json({ order })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка загрузки заказа')
    res.status(500).json({ error: 'failed_to_load_order' })
  }
})

// PATCH /api/orders/:id/status — смена статуса
router.patch('/:id/status', async (req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const status = String(req.body?.status || '').trim() as OrderStatus
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'invalid_status' })
    }
    const auth = getAuth()
    await updateOrderStatus(auth, sheetId, req.params.id, status)
    res.json({ ok: true })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка смены статуса')
    res.status(500).json({ error: 'failed_to_update_status' })
  }
})

// POST /api/orders/:id/ship — отметить отправленным + трек-номер + email клиенту
router.post('/:id/ship', async (req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const trackingNumber = String(req.body?.tracking_number || '').trim()
    if (!trackingNumber) {
      return res.status(400).json({ error: 'tracking_number обязателен' })
    }
    const auth = getAuth()
    await shipOrder(auth, sheetId, req.params.id, trackingNumber)

    // отправляем письмо клиенту (ошибка не блокирует ответ)
    try {
      const order = await fetchOrderWithItems(auth, sheetId, req.params.id)
      if (order?.customer_email) {
        const emailOpts = await getEmailContactOptions(sheetId)
        await sendEmail({
          to: order.customer_email,
          toName: order.customer_name,
          subject: buildShippingEmailSubject(order),
          html: buildShippingEmailHtml(order, trackingNumber, emailOpts),
          replyTo: process.env.SUPPORT_EMAIL,
        })
        await updateOrderEmailStatus(auth, sheetId, req.params.id, true, '')
      }
    } catch (mailErr: any) {
      const errMsg = mailErr?.message || 'неизвестная ошибка'
      logger.error({ err: errMsg, orderId: req.params.id }, 'не удалось отправить письмо об отправке')
      try {
        await updateOrderEmailStatus(auth, sheetId, req.params.id, false, errMsg)
      } catch {/* ignore */}
    }

    res.json({ ok: true })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка при отметке отправки')
    res.status(500).json({ error: 'failed_to_ship_order' })
  }
})

// POST /api/orders/:id/resend-email — переотправить письмо клиенту (тип письма выбирается по статусу заказа)
router.post('/:id/resend-email', async (req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const auth = getAuth()
    const order = await fetchOrderWithItems(auth, sheetId, req.params.id)
    if (!order) return res.status(404).json({ error: 'not_found' })
    if (!order.customer_email) return res.status(400).json({ error: 'no_customer_email' })

    const emailOpts = await getEmailContactOptions(sheetId)
    let subject = ''
    let html = ''
    if (order.status === 'shipped' && order.tracking_number) {
      subject = buildShippingEmailSubject(order)
      html = buildShippingEmailHtml(order, order.tracking_number, emailOpts)
    } else if (order.status === 'new' || order.status === 'shipped') {
      subject = buildOrderEmailSubject(order)
      html = buildOrderEmailHtml(order, emailOpts)
    } else {
      return res.status(400).json({ error: 'order_status_not_eligible_for_email' })
    }

    try {
      await sendEmail({
        to: order.customer_email,
        toName: order.customer_name,
        subject,
        html,
        replyTo: process.env.SUPPORT_EMAIL,
      })
      await updateOrderEmailStatus(auth, sheetId, order.id, true, '')
      res.json({ ok: true })
    } catch (mailErr: any) {
      const errMsg = mailErr?.message || 'неизвестная ошибка'
      logger.error({ err: errMsg, orderId: order.id }, 'переотправка письма не удалась')
      try { await updateOrderEmailStatus(auth, sheetId, order.id, false, errMsg) } catch {/* ignore */}
      res.status(502).json({ error: errMsg })
    }
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка переотправки письма')
    res.status(500).json({ error: 'failed_to_resend_email' })
  }
})

// DELETE /api/orders/:id — удаление заказа
router.delete('/:id', async (req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const auth = getAuth()
    await deleteOrder(auth, sheetId, req.params.id)
    res.json({ ok: true })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка удаления заказа')
    res.status(500).json({ error: 'failed_to_delete_order' })
  }
})

export default router
