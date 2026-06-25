import express from 'express'
import { requireAuth, hashPassword, verifyPasswordHash } from '../auth.js'
import {
  fetchOrdersSettingsFromSheet,
  saveOrdersSettingsToSheet,
  fetchDeliveryPriceOverrides,
  saveDeliveryPriceOverrides,
  fetchAdminCreds,
  saveAdminCreds,
  fetchTelegramChatId,
  saveTelegramChatId,
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

    // проверка текущего пароля: сначала Sheets, env — только как бутстрап (пока учётки в Sheets нет)
    let ok = false
    let currentUsername = ''
    let sheetsHasCreds = false
    let sheetsReadOk = false
    try {
      const creds = await fetchAdminCreds(sheetId)
      sheetsReadOk = true
      if (creds) {
        sheetsHasCreds = true
        if (verifyPasswordHash(currentPassword, creds.passwordHash)) {
          ok = true
          currentUsername = creds.username
        }
      }
    } catch { /* ignore */ }

    // env-фолбэк отключается, как только в Sheets появилась учётка (или Sheets недоступен) —
    // чтобы дефолтный admin/admin нельзя было использовать как «текущий» пароль
    const sheetsBlocksFallback = !sheetsReadOk || sheetsHasCreds
    if (!ok && !sheetsBlocksFallback) {
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

// ===== Telegram: chat ID =====

router.get('/telegram', async (_req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const chatId = await fetchTelegramChatId(sheetId)
    return res.json({ chatId })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка загрузки telegram chat_id')
    return res.status(500).json({ error: error?.message || 'Ошибка загрузки настроек Telegram' })
  }
})

router.put('/telegram', async (req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const { chatId } = req.body || {}
    if (typeof chatId !== 'string') {
      return res.status(400).json({ error: 'chatId must be a string' })
    }
    await saveTelegramChatId(sheetId, chatId)
    return res.json({ success: true })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка сохранения telegram chat_id')
    return res.status(500).json({ error: error?.message || 'Ошибка сохранения настроек Telegram' })
  }
})

router.post('/telegram/test', async (_req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const chatId = await fetchTelegramChatId(sheetId)
    if (!chatId) {
      return res.status(400).json({ error: 'Telegram chat ID не настроен' })
    }
    const botUrl = process.env.TG_BOT_URL || 'http://127.0.0.1:4002'
    const response = await fetch(`${botUrl}/test_notif`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as any
      return res.status(502).json({ error: body?.error || 'Бот вернул ошибку' })
    }
    return res.json({ success: true })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка отправки тестового уведомления')
    return res.status(500).json({ error: error?.message || 'Ошибка отправки тестового уведомления' })
  }
})

export default router
