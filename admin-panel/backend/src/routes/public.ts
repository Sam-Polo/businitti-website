import express from 'express'
import { fetchProductsFromSheet, type SheetProduct } from '../sheets.js'
import { logger } from '../logger.js'
import { createOrder, getAuth, DELIVERY_LABELS, getEffectiveDeliveryPrices, type DeliveryService } from '../orders-utils.js'
import { buildReceipt, createPaymentUrl } from '../robokassa.js'
import { orderLimiter } from '../rate-limit.js'
import { fetchOverridesMap, type SiteContentMap } from '../site-content-utils.js'
import { fetchCategoriesFromSheet, type Category } from '../categories-utils.js'
import { fetchOrdersSettingsFromSheet, fetchSaleOrder } from '../settings-utils.js'

const router = express.Router()

// простой in-memory кеш на 60 секунд, чтобы не дёргать Google Sheets каждый запрос
type CacheEntry = { data: SheetProduct[]; expiresAt: number }
let cache: CacheEntry | null = null
const CACHE_TTL_MS = 60_000

// кеш контента (60 сек) — переопределения текстов/фото со стороны админки
let contentCache: { data: SiteContentMap; expiresAt: number } | null = null
const CONTENT_CACHE_TTL_MS = 60_000

async function getContentOverridesCached(): Promise<SiteContentMap> {
  const now = Date.now()
  if (contentCache && contentCache.expiresAt > now) return contentCache.data
  const sheetId = process.env.GOOGLE_SHEET_ID
  if (!sheetId) return {}
  try {
    const data = await fetchOverridesMap(sheetId)
    contentCache = { data, expiresAt: now + CONTENT_CACHE_TTL_MS }
    return data
  } catch (err: any) {
    logger.warn({ err: err?.message }, 'не удалось загрузить переопределения контента — возвращаем пусто')
    return {}
  }
}

// принудительный сброс кеша контента (можно дёргать из админских роутов после изменения)
export function invalidateContentCache() {
  contentCache = null
}

async function getProductsCached(): Promise<SheetProduct[]> {
  const now = Date.now()
  if (cache && cache.expiresAt > now) return cache.data

  const sheetId = process.env.GOOGLE_SHEET_ID
  if (!sheetId) throw new Error('GOOGLE_SHEET_ID not configured')

  const products = await fetchProductsFromSheet(sheetId)
  cache = { data: products, expiresAt: now + CACHE_TTL_MS }
  return products
}

// публичный товар (без служебных полей)
type PublicProduct = {
  id?: string
  slug: string
  title: string
  description?: string
  categories: string[]
  price_rub: number
  discount_price_rub?: number
  images: string[]
  article?: string
}

function toPublic(p: SheetProduct): PublicProduct {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    categories: p.categories,
    price_rub: p.price_rub,
    discount_price_rub: p.discount_price_rub,
    images: p.images,
    article: p.article,
  }
}

// фильтр: только активные с положительным остатком
function isAvailable(p: SheetProduct): boolean {
  if (!p.active) return false
  if (typeof p.stock === 'number' && p.stock <= 0) return false
  return true
}

// сортировка по порядку строк в листе категории
function sortByOrder(category: string) {
  return (a: SheetProduct, b: SheetProduct) => {
    const oa = a.orderInCategory?.[category] ?? 999999
    const ob = b.orderInCategory?.[category] ?? 999999
    return oa - ob
  }
}

// кеш категорий (60 сек) — на сайте нужно описание и заголовок
let categoriesCache: { data: Category[]; expiresAt: number } | null = null
async function getCategoriesCached(): Promise<Category[]> {
  const now = Date.now()
  if (categoriesCache && categoriesCache.expiresAt > now) return categoriesCache.data
  const sheetId = process.env.GOOGLE_SHEET_ID
  if (!sheetId) return []
  try {
    const data = await fetchCategoriesFromSheet(sheetId)
    categoriesCache = { data, expiresAt: now + CACHE_TTL_MS }
    return data
  } catch (err: any) {
    logger.warn({ err: err?.message }, 'не удалось загрузить категории')
    return []
  }
}

export function invalidateCategoriesCache() {
  categoriesCache = null
}

// кеш порядка товаров в sale (60 сек) — заданный вручную порядок из листа settings
let saleOrderCache: { data: string[]; expiresAt: number } | null = null
async function getSaleOrderCached(): Promise<string[]> {
  const now = Date.now()
  if (saleOrderCache && saleOrderCache.expiresAt > now) return saleOrderCache.data
  const sheetId = process.env.GOOGLE_SHEET_ID
  if (!sheetId) return []
  try {
    const data = await fetchSaleOrder(sheetId)
    saleOrderCache = { data, expiresAt: now + CACHE_TTL_MS }
    return data
  } catch (err: any) {
    logger.warn({ err: err?.message }, 'не удалось загрузить порядок sale')
    return []
  }
}

export function invalidateSaleOrderCache() {
  saleOrderCache = null
}

// GET /api/public/categories — список категорий с заголовками и описанием
router.get('/categories', async (_req, res) => {
  try {
    const list = await getCategoriesCached()
    let visible = list.filter((c) => c.active !== false)

    // sale — виртуальная категория. Скрываем её, если сейчас нет товаров со скидкой,
    // чтобы пользователь не попал в пустую категорию.
    if (visible.some((c) => c.key === 'sale')) {
      try {
        const products = await getProductsCached()
        const hasAnyDiscount = products.some(
          (p) => p.active && (p.stock === undefined || p.stock > 0) &&
            p.discount_price_rub !== undefined && p.discount_price_rub > 0 &&
            p.discount_price_rub < p.price_rub,
        )
        if (!hasAnyDiscount) {
          visible = visible.filter((c) => c.key !== 'sale')
        }
      } catch {
        // если не удалось проверить — показываем sale как есть
      }
    }

    res.json({
      categories: visible.map((c) => ({
        key: c.key,
        title: c.title,
        description: c.description || '',
        image: c.image || '',
        image_position: c.image_position || 'center',
      })),
    })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка загрузки категорий')
    res.json({ categories: [] })
  }
})

// GET /api/public/content — переопределения текстов/фото (key → value)
router.get('/content', async (_req, res) => {
  try {
    const data = await getContentOverridesCached()
    res.json({ content: data })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка загрузки контента')
    res.json({ content: {} })
  }
})

// GET /api/public/delivery-prices — цены доставки для отображения на сайте
router.get('/delivery-prices', async (_req, res) => {
  const prices = await getEffectiveDeliveryPrices()
  res.json({
    cdek: { price: prices.cdek, label: DELIVERY_LABELS.cdek },
    yandex_market: { price: prices.yandex_market, label: DELIVERY_LABELS.yandex_market },
  })
})

// GET /api/public/orders-status — статус приёма заказов (закрыты ли + дата открытия)
router.get('/orders-status', async (_req, res) => {
  const sheetId = process.env.GOOGLE_SHEET_ID
  if (!sheetId) return res.json({ ordersClosed: false })
  try {
    const s = await fetchOrdersSettingsFromSheet(sheetId)
    res.json({ ordersClosed: s.ordersClosed, reopenDate: s.closeDate || null })
  } catch (err: any) {
    logger.warn({ err: err?.message }, 'не удалось прочесть orders-status')
    res.json({ ordersClosed: false })
  }
})

// % скидки 0..1 — для сортировки в виртуальной категории `sale`
function discountPct(p: SheetProduct): number {
  if (!p.discount_price_rub || p.discount_price_rub <= 0) return 0
  if (!p.price_rub || p.price_rub <= 0) return 0
  if (p.discount_price_rub >= p.price_rub) return 0
  return (p.price_rub - p.discount_price_rub) / p.price_rub
}

function hasDiscount(p: SheetProduct): boolean {
  return discountPct(p) > 0
}

// GET /api/public/products?category=necklaces — товары категории, отфильтрованные и в правильном порядке
// без category вернёт все доступные товары
// специальный category=sale — все товары со скидкой, отсортированные от большей скидки к меньшей
router.get('/products', async (req, res) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : ''
    const all = await getProductsCached()
    const available = all.filter(isAvailable)

    if (!category) {
      res.json({ products: available.map(toPublic) })
      return
    }

    if (category === 'sale') {
      // порядок: сначала расставленные вручную (settings.sale_order), затем остальные
      // по убыванию процента скидки
      const order = await getSaleOrderCached()
      const orderIndex = new Map(order.map((slug, i) => [slug, i]))
      const saleItems = available
        .filter(hasDiscount)
        .sort((a, b) => {
          const ia = orderIndex.has(a.slug) ? (orderIndex.get(a.slug) as number) : Number.POSITIVE_INFINITY
          const ib = orderIndex.has(b.slug) ? (orderIndex.get(b.slug) as number) : Number.POSITIVE_INFINITY
          if (ia !== ib) return ia - ib
          return discountPct(b) - discountPct(a)
        })
        .map(toPublic)
      res.json({ products: saleItems })
      return
    }

    const filtered = available
      .filter((p) => p.categories.includes(category))
      .sort(sortByOrder(category))
      .map(toPublic)

    res.json({ products: filtered })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка публичной загрузки товаров')
    res.status(500).json({ error: 'failed_to_load_products' })
  }
})

// GET /api/public/products/:slug — один товар (для будущей страницы товара)
router.get('/products/:slug', async (req, res) => {
  try {
    const slug = String(req.params.slug || '').trim()
    if (!slug) return res.status(400).json({ error: 'slug_required' })

    const all = await getProductsCached()
    const product = all.find((p) => p.slug === slug && isAvailable(p))

    if (!product) return res.status(404).json({ error: 'not_found' })
    res.json({ product: toPublic(product) })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка публичной загрузки товара')
    res.status(500).json({ error: 'failed_to_load_product' })
  }
})

// POST /api/public/orders — создание заказа с сайта
// body: { customer_name, customer_phone, customer_email, delivery_service, delivery_address, items: [{ slug, quantity }] }
router.post('/orders', orderLimiter, async (req, res) => {
  try {
    // блокируем приём заказов, если в админке выставлен флаг
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (sheetId) {
      try {
        const status = await fetchOrdersSettingsFromSheet(sheetId)
        if (status.ordersClosed) {
          return res.status(403).json({ error: 'orders_closed', reopenDate: status.closeDate || null })
        }
      } catch { /* если Sheets недоступен — не блокируем */ }
    }

    const body = req.body || {}
    const customer_name = String(body.customer_name || '').trim()
    const customer_phone = String(body.customer_phone || '').trim()
    const customer_email = String(body.customer_email || '').trim()
    const delivery_service = String(body.delivery_service || '').trim() as DeliveryService
    const delivery_address = String(body.delivery_address || '').trim()
    const comment = String(body.comment || '').trim() || undefined
    // ClientID Метрики / GA4 для серверной офлайн-конверсии purchase (best-effort)
    const metrika_client_id = String(body.metrika_client_id || '').trim().slice(0, 64) || undefined
    const ga_client_id = String(body.ga_client_id || '').trim().slice(0, 64) || undefined
    const itemsInput = Array.isArray(body.items) ? body.items : []

    if (!customer_name || !customer_phone || !customer_email) {
      return res.status(400).json({ error: 'customer_fields_required' })
    }
    if (delivery_service !== 'cdek' && delivery_service !== 'yandex_market') {
      return res.status(400).json({ error: 'invalid_delivery_service' })
    }
    if (!delivery_address) return res.status(400).json({ error: 'delivery_address_required' })
    if (itemsInput.length === 0) return res.status(400).json({ error: 'no_items' })

    // загружаем актуальные товары
    if (!sheetId) return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })

    const all = await getProductsCached()

    // валидация позиций + снапшот цен на сервере (не доверяем клиенту)
    const snapshotItems = []
    for (const raw of itemsInput) {
      const slug = String(raw?.slug || '').trim()
      const quantity = Math.max(1, parseInt(String(raw?.quantity ?? 1), 10) || 1)
      if (!slug) return res.status(400).json({ error: 'invalid_item_slug' })

      const product = all.find((p) => p.slug === slug)
      if (!product) return res.status(400).json({ error: 'product_not_found', slug })
      if (!product.active) return res.status(400).json({ error: 'product_inactive', slug })
      if (typeof product.stock === 'number' && product.stock < quantity) {
        return res.status(400).json({ error: 'insufficient_stock', slug })
      }

      const finalPrice = product.discount_price_rub && product.discount_price_rub > 0
        ? product.discount_price_rub
        : product.price_rub

      snapshotItems.push({
        product_slug: product.slug,
        product_title: product.title,
        product_article: product.article,
        product_image: product.images[0],
        price_rub: finalPrice,
        quantity,
        subtotal_rub: finalPrice * quantity,
      })
    }

    const auth = getAuth()
    const order = await createOrder(auth, sheetId, {
      customer_name,
      customer_phone,
      customer_email,
      delivery_service,
      delivery_address,
      comment,
      metrika_client_id,
      ga_client_id,
      items: snapshotItems,
    })

    // формируем чек для самозанятого (tax: "none") — товары + доставка
    const receipt = buildReceipt(
      snapshotItems.map((it) => ({
        name: it.product_title,
        quantity: it.quantity,
        price: it.price_rub,
      })),
      order.delivery_rub > 0
        ? { name: DELIVERY_LABELS[delivery_service], price: order.delivery_rub }
        : undefined
    )

    // строим URL Робокассы
    const payment = createPaymentUrl({
      outSum: order.total_rub,
      invId: order.inv_id,
      description: `Заказ #${order.display_id}`,
      email: customer_email,
      receipt,
    })

    res.json({
      order_id: order.id,
      display_id: order.display_id,
      inv_id: order.inv_id,
      delivery_rub: order.delivery_rub,
      total_rub: order.total_rub,
      payment_url: payment.paymentUrl,
    })

    // Уведомления в Telegram здесь НЕТ намеренно: заказ только создан и ещё не оплачен.
    // Бот получает заказ из webhook'а Робокассы (routes/payment.ts) после оплаты.
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка создания заказа')
    res.status(500).json({ error: 'failed_to_create_order' })
  }
})

export default router
