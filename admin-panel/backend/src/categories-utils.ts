import { google } from 'googleapis'
import { getAuthFromEnv, ensureProductSheet } from './sheets-utils.js'
import pino from 'pino'

const logger = pino()

export type Category = {
  key: string
  title: string
  description?: string
  image: string
  image_position?: string // например "50% 50%" или "center" для background-position
  order: number
  active: boolean // показывать ли на сайте
}

/**
 * Ключи, которые админ не может удалить и у которых нельзя поменять key.
 * Например `sale` — виртуальная категория, товары собираются по фильтру скидки.
 */
export const PROTECTED_KEYS = new Set(['sale'])

const SHEET_NAME = 'categories'
const DEFAULT_HEADERS = ['key', 'title', 'description', 'image', 'image_position', 'order', 'active']

// проверка/создание листа categories
async function ensureCategoriesSheet(sheets: any, sheetId: string): Promise<void> {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
  const exists = spreadsheet.data.sheets?.some(
    (s: any) => s.properties?.title === SHEET_NAME
  )
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [{
          addSheet: {
            properties: { title: SHEET_NAME }
          }
        }]
      }
    })
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!A1:G1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [DEFAULT_HEADERS]
      }
    })
    logger.info('лист categories создан')
  }
}

// чтение категорий из Google Sheets
export async function fetchCategoriesFromSheet(sheetId: string): Promise<Category[]> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })

  try {
    const range = `${SHEET_NAME}!A1:G500`
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range })
    const rows = res.data.values ?? []

    if (rows.length < 2) {
      return []
    }

    const header = rows[0].map((h: string) => String(h ?? '').trim().toLowerCase())
    const idx = (name: string) => header.indexOf(name)

    const categories: Category[] = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || r.length === 0) continue

      const get = (n: string) => String(r[idx(n)] ?? '').trim()
      const key = get('key')
      if (!key) continue

      const order = parseInt(get('order'), 10)
      const activeRaw = get('active').toLowerCase()
      // дефолт — true (для старых записей, где колонки active ещё нет)
      const active = activeRaw === '' || activeRaw === 'true' || activeRaw === '1' || activeRaw === 'yes'
      categories.push({
        key,
        title: get('title') || key,
        description: get('description') || undefined,
        image: get('image') || '',
        image_position: get('image_position') || 'center',
        order: Number.isFinite(order) ? order : i,
        active,
      })
    }

    categories.sort((a, b) => a.order - b.order)
    return categories
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.includes('Unable to parse range') || msg.includes('распознать') || e?.code === 400) {
      return []
    }
    throw e
  }
}

// сохранение списка категорий (перезапись)
export async function saveCategoriesToSheet(
  sheetId: string,
  categories: Category[]
): Promise<void> {
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })

  await ensureCategoriesSheet(sheets, sheetId)

  const values = [
    DEFAULT_HEADERS,
    ...categories.map((c, i) => [
      c.key,
      c.title,
      c.description || '',
      c.image,
      c.image_position || 'center',
      i,
      c.active === false ? 'false' : 'true',
    ])
  ]

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${SHEET_NAME}!A1:G${values.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  })

  // очищаем лишние строки
  if (values.length < 500) {
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME}!A${values.length + 1}:G500`
      })
    } catch (e: any) {
      logger.debug({ error: e?.message }, 'очистка лишних строк categories')
    }
  }

  // создаём листы товаров для всех категорий (если ещё нет) — никогда не удаляем здесь
  for (const c of categories) {
    const key = c.key.trim()
    if (!key || PROTECTED_KEYS.has(key)) continue
    try {
      await ensureProductSheet(auth, sheetId, key)
    } catch (e: any) {
      logger.warn({ key, error: e?.message }, 'не удалось создать лист категории')
    }
  }

  logger.info({ count: categories.length }, 'категории сохранены в Google Sheets')
}

/** Подсчёт строк с товарами в листе категории. Для protected/виртуальных категорий возвращает 0. */
export async function countProductsInCategorySheet(sheetId: string, key: string): Promise<number> {
  if (PROTECTED_KEYS.has(key)) return 0
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${key}!A2:A1000`,
    })
    const rows = res.data.values ?? []
    return rows.filter((r) => r && r[0] && String(r[0]).trim()).length
  } catch (e: any) {
    // листа может не быть
    return 0
  }
}

/** Удалить лист с товарами категории (вместе со всеми строками внутри). */
export async function deleteCategorySheet(sheetId: string, key: string): Promise<void> {
  if (PROTECTED_KEYS.has(key)) {
    throw new Error('protected_key')
  }
  const auth = getAuthFromEnv()
  const sheets = google.sheets({ version: 'v4', auth })
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
  const sheet = spreadsheet.data.sheets?.find((s: any) => s.properties?.title === key)
  const sheetIdNum = sheet?.properties?.sheetId
  if (sheetIdNum === undefined || sheetIdNum === null) {
    // листа уже нет — это не ошибка
    return
  }
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: [{ deleteSheet: { sheetId: sheetIdNum } }]
    }
  })
  logger.info({ key }, 'лист товаров категории удалён')
}
