import { google } from 'googleapis'
import { getAuthFromEnv, getSheetIdByName } from './sheets-utils.js'
import { logger } from './logger.js'

export type OrderStatus = 'pending_payment' | 'new' | 'shipped' | 'cancelled' | 'refunded'
export type DeliveryService = 'cdek' | 'yandex_market'

// Цены доставки (источник истины — бэк, чтобы клиент не подменил)
export const DELIVERY_PRICES: Record<DeliveryService, number> = {
  cdek: 650,
  yandex_market: 300,
}

export const DELIVERY_LABELS: Record<DeliveryService, string> = {
  cdek: 'Доставка СДЭК',
  yandex_market: 'Доставка Яндекс Маркет',
}

export type OrderItem = {
  order_id: string
  product_slug: string
  product_title: string
  product_article?: string
  product_image?: string
  price_rub: number
  quantity: number
  subtotal_rub: number
}

export type Order = {
  id: string
  display_id: number // например 1000
  inv_id: number
  created_at: string // ISO
  updated_at: string // ISO
  status: OrderStatus
  customer_name: string
  customer_phone: string
  customer_email: string
  delivery_service: DeliveryService
  delivery_address: string
  delivery_rub: number
  total_rub: number
}

export type OrderWithItems = Order & { items: OrderItem[] }

const ORDERS_SHEET = 'orders'
const ORDER_ITEMS_SHEET = 'order_items'

const ORDERS_HEADERS = [
  'id', 'display_id', 'inv_id', 'created_at', 'updated_at', 'status',
  'customer_name', 'customer_phone', 'customer_email',
  'delivery_service', 'delivery_address', 'delivery_rub', 'total_rub'
]

const ORDER_ITEMS_HEADERS = [
  'order_id', 'product_slug', 'product_title', 'product_article', 'product_image',
  'price_rub', 'quantity', 'subtotal_rub'
]

// проверка/создание листов для заказов
export async function ensureOrdersSheets(auth: any, sheetId: string): Promise<void> {
  const sheets = google.sheets({ version: 'v4', auth })
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
  const existing = new Set((spreadsheet.data.sheets || []).map((s: any) => s.properties?.title))

  const requests: any[] = []
  if (!existing.has(ORDERS_SHEET)) requests.push({ addSheet: { properties: { title: ORDERS_SHEET } } })
  if (!existing.has(ORDER_ITEMS_SHEET)) requests.push({ addSheet: { properties: { title: ORDER_ITEMS_SHEET } } })

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: sheetId, requestBody: { requests } })
  }

  if (!existing.has(ORDERS_SHEET)) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${ORDERS_SHEET}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [ORDERS_HEADERS] }
    })
    logger.info('лист orders создан')
  }
  if (!existing.has(ORDER_ITEMS_SHEET)) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${ORDER_ITEMS_SHEET}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [ORDER_ITEMS_HEADERS] }
    })
    logger.info('лист order_items создан')
  }

  // миграция: если в существующем листе orders нет колонки delivery_rub — добавляем
  if (existing.has(ORDERS_SHEET)) {
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${ORDERS_SHEET}!A1:Z1`
    })
    const currentHeaders = (headerRes.data.values?.[0] || []).map((h: string) => String(h).trim().toLowerCase())
    if (currentHeaders.length > 0 && !currentHeaders.includes('delivery_rub')) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${ORDERS_SHEET}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [ORDERS_HEADERS] }
      })
      logger.info('лист orders: добавлена колонка delivery_rub')
    }
  }
}

function parseOrderRow(row: any[], idx: Record<string, number>): Order | null {
  const id = String(row[idx.id] ?? '').trim()
  if (!id) return null
  return {
    id,
    display_id: Number(row[idx.display_id]) || 0,
    inv_id: Number(row[idx.inv_id]) || 0,
    created_at: String(row[idx.created_at] ?? ''),
    updated_at: String(row[idx.updated_at] ?? ''),
    status: (String(row[idx.status] ?? 'new') as OrderStatus),
    customer_name: String(row[idx.customer_name] ?? ''),
    customer_phone: String(row[idx.customer_phone] ?? ''),
    customer_email: String(row[idx.customer_email] ?? ''),
    delivery_service: (String(row[idx.delivery_service] ?? 'cdek') as DeliveryService),
    delivery_address: String(row[idx.delivery_address] ?? ''),
    delivery_rub: Number(row[idx.delivery_rub]) || 0,
    total_rub: Number(row[idx.total_rub]) || 0,
  }
}

function parseItemRow(row: any[], idx: Record<string, number>): OrderItem | null {
  const order_id = String(row[idx.order_id] ?? '').trim()
  if (!order_id) return null
  return {
    order_id,
    product_slug: String(row[idx.product_slug] ?? ''),
    product_title: String(row[idx.product_title] ?? ''),
    product_article: String(row[idx.product_article] ?? '') || undefined,
    product_image: String(row[idx.product_image] ?? '') || undefined,
    price_rub: Number(row[idx.price_rub]) || 0,
    quantity: Number(row[idx.quantity]) || 0,
    subtotal_rub: Number(row[idx.subtotal_rub]) || 0,
  }
}

function buildHeaderIndex(headers: string[]): Record<string, number> {
  const idx: Record<string, number> = {}
  headers.forEach((h, i) => { idx[h.trim().toLowerCase()] = i })
  return idx
}

// чтение всех заказов
export async function fetchOrders(auth: any, sheetId: string): Promise<Order[]> {
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${ORDERS_SHEET}!A1:Z`
  })
  const rows = res.data.values || []
  if (rows.length < 2) return []

  const idx = buildHeaderIndex(rows[0])
  const out: Order[] = []
  for (let i = 1; i < rows.length; i++) {
    const parsed = parseOrderRow(rows[i], idx)
    if (parsed) out.push(parsed)
  }
  // новые сверху
  out.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
  return out
}

// чтение позиций конкретного заказа
export async function fetchOrderItems(auth: any, sheetId: string, orderId: string): Promise<OrderItem[]> {
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${ORDER_ITEMS_SHEET}!A1:Z`
  })
  const rows = res.data.values || []
  if (rows.length < 2) return []

  const idx = buildHeaderIndex(rows[0])
  const out: OrderItem[] = []
  for (let i = 1; i < rows.length; i++) {
    const parsed = parseItemRow(rows[i], idx)
    if (parsed && parsed.order_id === orderId) out.push(parsed)
  }
  return out
}

// получение заказа по id вместе с позициями
export async function fetchOrderWithItems(auth: any, sheetId: string, orderId: string): Promise<OrderWithItems | null> {
  const all = await fetchOrders(auth, sheetId)
  const order = all.find((o) => o.id === orderId)
  if (!order) return null
  const items = await fetchOrderItems(auth, sheetId, orderId)
  return { ...order, items }
}

// получение заказа по inv_id (для Робокассы)
export async function findOrderByInvId(auth: any, sheetId: string, invId: number): Promise<Order | null> {
  const all = await fetchOrders(auth, sheetId)
  return all.find((o) => o.inv_id === invId) || null
}

// следующий display_id и inv_id (от max + 1, минимум 1000)
async function nextIds(auth: any, sheetId: string): Promise<{ display_id: number; inv_id: number }> {
  const orders = await fetchOrders(auth, sheetId)
  const maxDisplay = orders.reduce((m, o) => Math.max(m, o.display_id || 0), 999)
  const maxInv = orders.reduce((m, o) => Math.max(m, o.inv_id || 0), 999)
  return { display_id: maxDisplay + 1, inv_id: maxInv + 1 }
}

// создание заказа (включая позиции). статус по умолчанию pending_payment
export async function createOrder(
  auth: any,
  sheetId: string,
  data: {
    customer_name: string
    customer_phone: string
    customer_email: string
    delivery_service: DeliveryService
    delivery_address: string
    items: Array<Omit<OrderItem, 'order_id'>>
  }
): Promise<OrderWithItems> {
  await ensureOrdersSheets(auth, sheetId)
  const sheets = google.sheets({ version: 'v4', auth })

  const { display_id, inv_id } = await nextIds(auth, sheetId)
  const id = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const now = new Date().toISOString()
  const delivery_rub = DELIVERY_PRICES[data.delivery_service]
  const items_sum = data.items.reduce((s, it) => s + it.subtotal_rub, 0)
  const total_rub = items_sum + delivery_rub

  const order: Order = {
    id,
    display_id,
    inv_id,
    created_at: now,
    updated_at: now,
    status: 'pending_payment',
    customer_name: data.customer_name,
    customer_phone: data.customer_phone,
    customer_email: data.customer_email,
    delivery_service: data.delivery_service,
    delivery_address: data.delivery_address,
    delivery_rub,
    total_rub,
  }

  const orderRow = ORDERS_HEADERS.map((h) => (order as any)[h] ?? '')
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${ORDERS_SHEET}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [orderRow] }
  })

  const itemRows = data.items.map((it) => {
    const full: OrderItem = { ...it, order_id: id }
    return ORDER_ITEMS_HEADERS.map((h) => (full as any)[h] ?? '')
  })
  if (itemRows.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${ORDER_ITEMS_SHEET}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: itemRows }
    })
  }

  logger.info({ id, display_id, inv_id }, 'заказ создан')
  return { ...order, items: data.items.map((it) => ({ ...it, order_id: id })) }
}

// найти номер строки заказа в листе orders (1-based)
async function findOrderRowNumber(auth: any, sheetId: string, orderId: string): Promise<number | null> {
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${ORDERS_SHEET}!A1:Z`
  })
  const rows = res.data.values || []
  if (rows.length < 2) return null
  const idx = buildHeaderIndex(rows[0])
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idx.id] ?? '').trim() === orderId) return i + 1
  }
  return null
}

// смена статуса заказа
export async function updateOrderStatus(
  auth: any,
  sheetId: string,
  orderId: string,
  status: OrderStatus
): Promise<void> {
  const sheets = google.sheets({ version: 'v4', auth })
  const rowNumber = await findOrderRowNumber(auth, sheetId, orderId)
  if (!rowNumber) throw new Error(`Заказ "${orderId}" не найден`)

  // читаем заголовки чтобы найти точные колонки status и updated_at
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${ORDERS_SHEET}!A1:Z1`
  })
  const idx = buildHeaderIndex(headerRes.data.values?.[0] || [])
  const colLetter = (i: number) => String.fromCharCode(65 + i)

  const now = new Date().toISOString()
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: `${ORDERS_SHEET}!${colLetter(idx.status)}${rowNumber}`,
          values: [[status]]
        },
        {
          range: `${ORDERS_SHEET}!${colLetter(idx.updated_at)}${rowNumber}`,
          values: [[now]]
        }
      ]
    }
  })
  logger.info({ orderId, status }, 'статус заказа обновлён')
}

// удаление заказа (вместе с позициями)
export async function deleteOrder(auth: any, sheetId: string, orderId: string): Promise<void> {
  const sheets = google.sheets({ version: 'v4', auth })
  const rowNumber = await findOrderRowNumber(auth, sheetId, orderId)
  if (!rowNumber) throw new Error(`Заказ "${orderId}" не найден`)

  const ordersSheetId = await getSheetIdByName(auth, sheetId, ORDERS_SHEET)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: ordersSheetId,
            dimension: 'ROWS',
            startIndex: rowNumber - 1,
            endIndex: rowNumber
          }
        }
      }]
    }
  })

  // удаляем все позиции заказа из листа order_items
  const itemsRes = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${ORDER_ITEMS_SHEET}!A1:Z`
  })
  const itemRows = itemsRes.data.values || []
  if (itemRows.length >= 2) {
    const idx = buildHeaderIndex(itemRows[0])
    // собираем номера строк в обратном порядке чтобы удалить безопасно
    const toDelete: number[] = []
    for (let i = 1; i < itemRows.length; i++) {
      if (String(itemRows[i][idx.order_id] ?? '').trim() === orderId) toDelete.push(i + 1)
    }
    if (toDelete.length > 0) {
      const itemsSheetIdNum = await getSheetIdByName(auth, sheetId, ORDER_ITEMS_SHEET)
      const requests = toDelete.sort((a, b) => b - a).map((rn) => ({
        deleteDimension: {
          range: {
            sheetId: itemsSheetIdNum,
            dimension: 'ROWS',
            startIndex: rn - 1,
            endIndex: rn
          }
        }
      }))
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { requests }
      })
    }
  }

  logger.info({ orderId }, 'заказ удалён')
}

// удобный единый вход
export function getAuth() {
  return getAuthFromEnv()
}

/**
 * Уменьшает stock у всех товаров заказа во всех листах (категориях), где они есть.
 * Если у товара stock пустой (вручную собирается) — пропускаем.
 * Ошибки по отдельным товарам не валят весь процесс — логируем и продолжаем.
 */
export async function decrementStockForOrder(
  auth: any,
  sheetId: string,
  orderId: string
): Promise<void> {
  const items = await fetchOrderItems(auth, sheetId, orderId)
  if (items.length === 0) return

  const { fetchCategoriesFromSheet } = await import('./categories-utils.js')
  const categories = await fetchCategoriesFromSheet(sheetId)
  const sheetNames = categories.length > 0
    ? categories.map((c) => c.key)
    : (process.env.SHEET_NAMES?.split(',') || []).map((s) => s.trim()).filter(Boolean)

  const sheets = google.sheets({ version: 'v4', auth })

  for (const item of items) {
    for (const sheetName of sheetNames) {
      try {
        const range = `${sheetName}!A:Z`
        const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range })
        const rows = res.data.values || []
        if (rows.length < 2) continue

        const headers = rows[0].map((h: string) => String(h).trim().toLowerCase())
        const slugIdx = headers.indexOf('slug')
        const stockIdx = headers.indexOf('stock')
        if (slugIdx === -1 || stockIdx === -1) continue

        for (let i = 1; i < rows.length; i++) {
          if (String(rows[i][slugIdx] ?? '').trim() !== item.product_slug) continue
          const stockRaw = String(rows[i][stockIdx] ?? '').trim()
          if (stockRaw === '') break // ручная сборка — не трогаем
          const stockNum = Number(stockRaw.replace(',', '.'))
          if (!Number.isFinite(stockNum)) break
          const newStock = Math.max(0, stockNum - item.quantity)
          const colLetter = String.fromCharCode(65 + stockIdx)
          await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: `${sheetName}!${colLetter}${i + 1}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[newStock]] }
          })
          logger.info({ slug: item.product_slug, sheetName, was: stockNum, now: newStock }, 'stock уменьшен')
          break
        }
      } catch (e: any) {
        logger.warn({ slug: item.product_slug, sheetName, error: e?.message }, 'не удалось обновить stock')
      }
    }
  }
}
