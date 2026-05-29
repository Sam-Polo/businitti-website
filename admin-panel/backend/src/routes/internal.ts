import express from 'express'
import { fetchOrders, fetchOrderWithItems, getAuth } from '../orders-utils.js'
import {
  fetchOrdersSettingsFromSheet,
  saveOrdersSettingsToSheet,
} from '../settings-utils.js'
import { logger } from '../logger.js'

const router = express.Router()

function requireInternalKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return next() // ключ не задан — защита отключена (ок, т.к. порт закрыт снаружи)
  if (req.headers['x-internal-key'] !== key) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  next()
}

router.use(requireInternalKey)

function getSheetId(res: express.Response): string | null {
  const sheetId = process.env.GOOGLE_SHEET_ID
  if (!sheetId) {
    res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    return null
  }
  return sheetId
}

// GET /api/internal/orders/new — заказы со статусом new
router.get('/orders/new', async (_req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const auth = getAuth()
    const all = await fetchOrders(auth, sheetId)
    return res.json(all.filter((o) => o.status === 'new'))
  } catch (error: any) {
    logger.error({ error: error?.message }, 'internal: ошибка загрузки новых заказов')
    return res.status(500).json({ error: error?.message })
  }
})

// GET /api/internal/orders?limit=5 — последние N заказов
router.get('/orders', async (req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const auth = getAuth()
    const limit = Math.min(20, Math.max(1, parseInt(String(req.query.limit ?? 5), 10) || 5))
    const all = await fetchOrders(auth, sheetId)
    return res.json(all.slice(0, limit))
  } catch (error: any) {
    logger.error({ error: error?.message }, 'internal: ошибка загрузки заказов')
    return res.status(500).json({ error: error?.message })
  }
})

// GET /api/internal/orders/:displayId — заказ по display_id с позициями
router.get('/orders/:displayId', async (req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const auth = getAuth()
    const displayId = parseInt(req.params.displayId, 10)
    if (isNaN(displayId)) {
      return res.status(400).json({ error: 'invalid_display_id' })
    }
    const all = await fetchOrders(auth, sheetId)
    const order = all.find((o) => o.display_id === displayId)
    if (!order) return res.status(404).json({ error: 'not_found' })
    const full = await fetchOrderWithItems(auth, sheetId, order.id)
    return res.json(full)
  } catch (error: any) {
    logger.error({ error: error?.message }, 'internal: ошибка загрузки заказа')
    return res.status(500).json({ error: error?.message })
  }
})

// GET /api/internal/stats — статистика за сегодня
router.get('/stats', async (_req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const auth = getAuth()
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const all = await fetchOrders(auth, sheetId)
    const todayOrders = all.filter((o) => o.created_at.startsWith(today))
    const revenue = todayOrders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
      .reduce((sum, o) => sum + o.total_rub, 0)
    const byStatus = todayOrders.reduce((acc: Record<string, number>, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1
      return acc
    }, {})
    return res.json({ date: today, total: todayOrders.length, revenue, byStatus })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'internal: ошибка загрузки статистики')
    return res.status(500).json({ error: error?.message })
  }
})

// GET /api/internal/orders-status — открыты ли заказы
router.get('/orders-status', async (_req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const status = await fetchOrdersSettingsFromSheet(sheetId)
    return res.json(status)
  } catch (error: any) {
    logger.error({ error: error?.message }, 'internal: ошибка загрузки статуса заказов')
    return res.status(500).json({ error: error?.message })
  }
})

// POST /api/internal/orders-status — закрыть/открыть заказы
// body: { closed: boolean }
router.post('/orders-status', async (req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const { closed } = req.body || {}
    if (typeof closed !== 'boolean') {
      return res.status(400).json({ error: 'closed must be boolean' })
    }
    await saveOrdersSettingsToSheet(sheetId, { ordersClosed: closed })
    return res.json({ success: true })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'internal: ошибка смены статуса заказов')
    return res.status(500).json({ error: error?.message })
  }
})

export default router
