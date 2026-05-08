import express from 'express'
import { fetchProductsFromSheet, type SheetProduct } from '../sheets.js'
import { logger } from '../logger.js'

const router = express.Router()

// простой in-memory кеш на 60 секунд, чтобы не дёргать Google Sheets каждый запрос
type CacheEntry = { data: SheetProduct[]; expiresAt: number }
let cache: CacheEntry | null = null
const CACHE_TTL_MS = 60_000

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

// GET /api/public/products?category=necklaces — товары категории, отфильтрованные и в правильном порядке
// без category вернёт все доступные товары
router.get('/products', async (req, res) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : ''
    const all = await getProductsCached()
    const available = all.filter(isAvailable)

    if (!category) {
      res.json({ products: available.map(toPublic) })
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

export default router
