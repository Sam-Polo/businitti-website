import express from 'express'
import { requireAuth } from '../auth.js'
import {
  fetchCategoriesFromSheet,
  saveCategoriesToSheet,
  countProductsInCategorySheet,
  deleteCategorySheet,
  PROTECTED_KEYS,
  type Category
} from '../categories-utils.js'
import { invalidateCategoriesCache } from './public.js'
import pino from 'pino'

const logger = pino()
const router = express.Router()

router.use(requireAuth)

function normalizeKey(input: string): string {
  return String(input || '').trim().toLowerCase()
}

function isValidKey(key: string): boolean {
  return /^[a-z][a-z0-9_-]{1,40}$/.test(key)
}

function getSheetId(res: express.Response): string | null {
  const sheetId = process.env.GOOGLE_SHEET_ID
  if (!sheetId) {
    res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    return null
  }
  return sheetId
}

// получить все категории (для админки — включая скрытые)
router.get('/', async (_req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const categories = await fetchCategoriesFromSheet(sheetId)
    return res.json({ categories })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка загрузки категорий')
    return res.status(500).json({ error: error?.message || 'Ошибка загрузки категорий' })
  }
})

// сохранить категории (полная перезапись — для редактирования существующих и dnd-сортировки)
router.put('/', async (req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const { categories } = req.body
    if (!Array.isArray(categories)) {
      return res.status(400).json({ error: 'categories must be an array' })
    }

    const valid: Category[] = []
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i]
      if (!c || typeof c.key !== 'string' || !c.key.trim()) continue
      if (typeof c.title !== 'string') continue
      if (typeof c.image !== 'string') c.image = ''

      valid.push({
        key: normalizeKey(c.key),
        title: (c.title || c.key).trim(),
        description: typeof c.description === 'string' ? c.description.trim() || undefined : undefined,
        image: (c.image || '').trim(),
        image_position: typeof c.image_position === 'string' ? c.image_position.trim() || 'center' : 'center',
        order: i,
        active: c.active !== false, // дефолт true
      })
    }

    await saveCategoriesToSheet(sheetId, valid)
    invalidateCategoriesCache()
    return res.json({ success: true, categories: valid })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка сохранения категорий')
    return res.status(500).json({ error: error?.message || 'Ошибка сохранения категорий' })
  }
})

// добавление новой категории + создание листа товаров
router.post('/', async (req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const body = req.body || {}
    const key = normalizeKey(body.key)
    const title = String(body.title || '').trim()
    if (!key || !isValidKey(key)) {
      return res.status(400).json({ error: 'invalid_key' })
    }
    if (!title) {
      return res.status(400).json({ error: 'title_required' })
    }

    const existing = await fetchCategoriesFromSheet(sheetId)
    if (existing.some((c) => c.key === key)) {
      return res.status(409).json({ error: 'key_exists' })
    }

    const next: Category[] = [
      ...existing,
      {
        key,
        title,
        description: typeof body.description === 'string' ? body.description.trim() || undefined : undefined,
        image: typeof body.image === 'string' ? body.image.trim() : '',
        image_position: typeof body.image_position === 'string' ? body.image_position.trim() || 'center' : 'center',
        order: existing.length,
        active: body.active !== false,
      },
    ]

    await saveCategoriesToSheet(sheetId, next) // ensureProductSheet вызывается внутри
    invalidateCategoriesCache()
    return res.json({ success: true, category: next[next.length - 1] })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка создания категории')
    return res.status(500).json({ error: error?.message || 'Ошибка создания категории' })
  }
})

// количество товаров в категории (для confirm перед удалением)
router.get('/:key/product-count', async (req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const key = normalizeKey(req.params.key)
    const count = await countProductsInCategorySheet(sheetId, key)
    return res.json({ count })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка подсчёта товаров')
    return res.status(500).json({ error: error?.message || 'Ошибка подсчёта' })
  }
})

// удаление категории (вместе с листом товаров)
router.delete('/:key', async (req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const key = normalizeKey(req.params.key)
    if (PROTECTED_KEYS.has(key)) {
      return res.status(403).json({ error: 'protected_key' })
    }

    const existing = await fetchCategoriesFromSheet(sheetId)
    const found = existing.find((c) => c.key === key)
    if (!found) {
      return res.status(404).json({ error: 'not_found' })
    }

    // удаляем лист товаров (если есть)
    try {
      await deleteCategorySheet(sheetId, key)
    } catch (e: any) {
      logger.warn({ key, err: e?.message }, 'не удалось удалить лист товаров — продолжаем')
    }

    const next = existing.filter((c) => c.key !== key)
    await saveCategoriesToSheet(sheetId, next)
    invalidateCategoriesCache()
    return res.json({ success: true })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка удаления категории')
    return res.status(500).json({ error: error?.message || 'Ошибка удаления категории' })
  }
})

export default router
