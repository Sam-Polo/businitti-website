import { google } from 'googleapis'
import { getAuthFromEnv } from './sheets-utils.js'
import { logger } from './logger.js'

/**
 * Лист `settings` — простой K-V-стор для админских настроек:
 *   key | value
 *
 * Поддерживаемые ключи:
 *   - orders_closed (boolean, "true"/"false")
 *   - close_date (YYYY-MM-DD)
 *   - delivery_cdek_price (number)
 *   - delivery_yandex_price (number)
 *   - admin_username (string)
 *   - admin_password_hash ("scrypt:salt:hash")
 *   - sale_order (список slug'ов через запятую — заданный вручную порядок товаров в
 *     виртуальной категории `sale`; товары не из списка идут в конец)
 */

const SHEET_NAME = 'settings'

async function ensureSettingsSheet(sheetId: string): Promise<void> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
  const exists = spreadsheet.data.sheets?.some((s) => s.properties?.title === SHEET_NAME)
  if (exists) return
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] },
  })
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A1:B1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [['key', 'value']] },
  })
}

/** Прочесть все настройки в мапу. */
export async function fetchAllSettings(sheetId: string): Promise<Record<string, string>> {
  await ensureSettingsSheet(sheetId)
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A2:B`,
    })
    const rows = res.data.values ?? []
    const out: Record<string, string> = {}
    for (const row of rows) {
      const key = String(row?.[0] ?? '').trim().toLowerCase()
      if (!key) continue
      out[key] = String(row?.[1] ?? '')
    }
    return out
  } catch (error: any) {
    logger.warn({ error: error?.message }, 'не удалось прочесть settings')
    return {}
  }
}

async function findRowIndexForKey(sheets: any, sheetId: string, key: string): Promise<number> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A2:A`,
  })
  const rows = res.data.values ?? []
  for (let i = 0; i < rows.length; i++) {
    const k = String(rows[i]?.[0] ?? '').trim().toLowerCase()
    if (k === key) return i + 2
  }
  return -1
}

/** Перезаписать одно значение (или вставить, если ключа ещё нет). */
export async function setSetting(sheetId: string, key: string, value: string): Promise<void> {
  await ensureSettingsSheet(sheetId)
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })
  const k = key.toLowerCase()
  const rowIndex = await findRowIndexForKey(sheets, sheetId, k)
  if (rowIndex > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A${rowIndex}:B${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[k, value]] },
    })
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A:B`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [[k, value]] },
    })
  }
}

// ===== Типизированные аксессоры =====

export type OrdersSettings = {
  ordersClosed: boolean
  closeDate?: string
}

export async function fetchOrdersSettingsFromSheet(sheetId: string): Promise<OrdersSettings> {
  const all = await fetchAllSettings(sheetId)
  const closedRaw = (all['orders_closed'] || all['order_closed'] || '').trim().toLowerCase()
  const ordersClosed = closedRaw === 'true' || closedRaw === '1' || closedRaw === 'yes'
  const closeDate = (all['close_date'] || '').trim()
  return { ordersClosed, closeDate: closeDate || undefined }
}

export async function saveOrdersSettingsToSheet(sheetId: string, s: OrdersSettings): Promise<void> {
  await setSetting(sheetId, 'orders_closed', s.ordersClosed ? 'true' : 'false')
  await setSetting(sheetId, 'close_date', s.closeDate || '')
}

export type DeliveryPriceOverrides = {
  cdek?: number
  yandex_market?: number
}

export async function fetchDeliveryPriceOverrides(sheetId: string): Promise<DeliveryPriceOverrides> {
  const all = await fetchAllSettings(sheetId)
  const cdek = Number(all['delivery_cdek_price'])
  const ym = Number(all['delivery_yandex_price'])
  return {
    cdek: Number.isFinite(cdek) && cdek > 0 ? cdek : undefined,
    yandex_market: Number.isFinite(ym) && ym > 0 ? ym : undefined,
  }
}

export async function saveDeliveryPriceOverrides(
  sheetId: string,
  prices: { cdek: number; yandex_market: number },
): Promise<void> {
  await setSetting(sheetId, 'delivery_cdek_price', String(prices.cdek))
  await setSetting(sheetId, 'delivery_yandex_price', String(prices.yandex_market))
}

export type AdminCreds = {
  username: string
  passwordHash: string
}

export async function fetchAdminCreds(sheetId: string): Promise<AdminCreds | null> {
  const all = await fetchAllSettings(sheetId)
  const username = (all['admin_username'] || '').trim()
  const passwordHash = (all['admin_password_hash'] || '').trim()
  if (!username || !passwordHash) return null
  return { username, passwordHash }
}

export async function saveAdminCreds(sheetId: string, creds: AdminCreds): Promise<void> {
  await setSetting(sheetId, 'admin_username', creds.username)
  await setSetting(sheetId, 'admin_password_hash', creds.passwordHash)
}

export async function fetchTelegramChatId(sheetId: string): Promise<string> {
  const all = await fetchAllSettings(sheetId)
  return (all['telegram_chat_id'] || '').trim()
}

export async function saveTelegramChatId(sheetId: string, chatId: string): Promise<void> {
  await setSetting(sheetId, 'telegram_chat_id', chatId.trim())
}

/**
 * Порядок товаров в виртуальной категории `sale` — список slug'ов.
 * Хранится строкой через запятую (slug'и матчат `^[a-z0-9_-]+$`, запятая безопасна).
 */
export async function fetchSaleOrder(sheetId: string): Promise<string[]> {
  const all = await fetchAllSettings(sheetId)
  const raw = (all['sale_order'] || '').trim()
  if (!raw) return []
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

export async function saveSaleOrder(sheetId: string, slugs: string[]): Promise<void> {
  const clean = slugs.map((s) => String(s).trim()).filter(Boolean)
  await setSetting(sheetId, 'sale_order', clean.join(','))
}
