import express from 'express'
import { requireAuth, hashPassword, verifyPasswordHash } from '../auth.js'
import {
  fetchOrdersSettingsFromSheet,
  saveOrdersSettingsToSheet,
  fetchDeliveryPriceOverrides,
  saveDeliveryPriceOverrides,
  fetchAdminCreds,
  saveAdminCreds,
} from '../settings-utils.js'
import { DELIVERY_PRICES, invalidateDeliveryPricesCache } from '../orders-utils.js'
import pino from 'pino'

const logger = pino()
const router = express.Router()

router.use(requireAuth)

function getSheetId(res: express.Response): string | null {
  const sheetId = process.env.GOOGLE_SHEET_ID
  if (!sheetId) {
    res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    return null
  }
  return sheetId
}

// ===== Заказы: открыты/закрыты + дата открытия =====

router.get('/orders-status', async (_req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const settings = await fetchOrdersSettingsFromSheet(sheetId)
    return res.json(settings)
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка загрузки настроек заказов')
    return res.status(500).json({ error: error?.message || 'Ошибка загрузки настроек заказов' })
  }
})

router.put('/orders-status', async (req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const { ordersClosed, closeDate } = req.body
    if (typeof ordersClosed !== 'boolean') {
      return res.status(400).json({ error: 'ordersClosed must be a boolean' })
    }
    if (closeDate !== undefined && closeDate !== null && closeDate !== '') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(closeDate)) {
        return res.status(400).json({ error: 'closeDate must be in format YYYY-MM-DD' })
      }
    }
    await saveOrdersSettingsToSheet(sheetId, {
      ordersClosed,
      closeDate: closeDate || undefined,
    })
    return res.json({ success: true })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка сохранения настроек заказов')
    return res.status(500).json({ error: error?.message || 'Ошибка сохранения настроек заказов' })
  }
})

// ===== Цены доставки =====

router.get('/delivery-prices', async (_req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const overrides = await fetchDeliveryPriceOverrides(sheetId)
    return res.json({
      cdek: overrides.cdek ?? DELIVERY_PRICES.cdek,
      yandex_market: overrides.yandex_market ?? DELIVERY_PRICES.yandex_market,
      // дефолты возвращаем тоже, чтобы админ видел исходные значения
      defaults: DELIVERY_PRICES,
      isOverridden: {
        cdek: overrides.cdek !== undefined,
        yandex_market: overrides.yandex_market !== undefined,
      },
    })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка загрузки цен доставки')
    return res.status(500).json({ error: error?.message || 'Ошибка загрузки цен доставки' })
  }
})

router.put('/delivery-prices', async (req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const { cdek, yandex_market } = req.body || {}
    const cdekNum = Number(cdek)
    const ymNum = Number(yandex_market)
    if (!Number.isFinite(cdekNum) || cdekNum <= 0) {
      return res.status(400).json({ error: 'cdek_must_be_positive' })
    }
    if (!Number.isFinite(ymNum) || ymNum <= 0) {
      return res.status(400).json({ error: 'yandex_market_must_be_positive' })
    }
    await saveDeliveryPriceOverrides(sheetId, { cdek: cdekNum, yandex_market: ymNum })
    invalidateDeliveryPricesCache()
    return res.json({ success: true })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка сохранения цен доставки')
    return res.status(500).json({ error: error?.message || 'Ошибка сохранения цен доставки' })
  }
})

// ===== Смена пароля =====

router.post('/change-password', async (req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const { currentPassword, newUsername, newPassword } = req.body || {}
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'invalid_request' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'password_too_short' })
    }
    const username = typeof newUsername === 'string' && newUsername.trim()
      ? newUsername.trim()
      : null

    // проверка текущего пароля: сначала Sheets, иначе env
    let ok = false
    let currentUsername = ''
    try {
      const creds = await fetchAdminCreds(sheetId)
      if (creds && verifyPasswordHash(currentPassword, creds.passwordHash)) {
        ok = true
        currentUsername = creds.username
      }
    } catch { /* ignore */ }

    if (!ok) {
      const envUser = process.env.ADMIN_USERNAME || 'admin'
      const envPass = process.env.ADMIN_PASSWORD || 'admin'
      if (currentPassword === envPass) {
        ok = true
        currentUsername = envUser
      }
    }

    if (!ok) {
      return res.status(401).json({ error: 'wrong_current_password' })
    }

    await saveAdminCreds(sheetId, {
      username: username || currentUsername || 'admin',
      passwordHash: hashPassword(newPassword),
    })
    return res.json({ success: true })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка смены пароля')
    return res.status(500).json({ error: error?.message || 'Ошибка смены пароля' })
  }
})

export default router
