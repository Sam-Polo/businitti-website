import express from 'express'
import { requireAuth } from '../auth.js'
import {
  fetchCategoriesFromSheet,
  saveCategoriesToSheet,
  countProductsInCategorySheet,
  deleteCategorySheet,
  renameCategorySheet,
  PROTECTED_KEYS,
  type Category
} from '../categories-utils.js'
import { invalidateCategoriesCache, invalidateProductsCache } from './public.js'
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

    // защита от потери данных: full-overwrite доверяет списку клиента, который может
    // быть устаревшим. Protected-категории (sale) сохраняем всегда — если клиент их
    // не прислал, дописываем из текущего листа.
    const existing = await fetchCategoriesFromSheet(sheetId)
    const sentKeys = new Set(valid.map((c) => c.key))
    for (const ex of existing) {
      if (PROTECTED_KEYS.has(ex.key) && !sentKeys.has(ex.key)) {
        logger.warn({ key: ex.key }, 'protected-категория отсутствовала в PUT — восстанавливаем')
        valid.push({ ...ex, order: valid.length })
      }
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

// переименование ключа категории: key — это и slug в URL сайта, и имя листа с товарами,
// поэтому меняем их вместе. Товары трогать не нужно: категория товара определяется листом,
// в котором лежит его строка, отдельной колонки с категорией в листах нет.
router.post('/:key/rename', async (req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const fromKey = normalizeKey(req.params.key)
    const toKey = normalizeKey((req.body || {}).key)

    if (!isValidKey(toKey)) {
      return res.status(400).json({ error: 'invalid_key' })
    }
    if (PROTECTED_KEYS.has(fromKey) || PROTECTED_KEYS.has(toKey)) {
      return res.status(403).json({ error: 'protected_key' })
    }
    if (fromKey === toKey) {
      return res.json({ success: true, key: toKey })
    }

    const existing = await fetchCategoriesFromSheet(sheetId)
    const current = existing.find((c) => c.key === fromKey)
    if (!current) {
      return res.status(404).json({ error: 'not_found' })
    }
    if (existing.some((c) => c.key === toKey)) {
      return res.status(409).json({ error: 'key_exists' })
    }

    await renameCategorySheet(sheetId, fromKey, toKey)

    // строку в листе categories пишем только после успешного переименования листа.
    // Если запись всё же упадёт — откатываем имя листа, иначе key и лист разъедутся
    // и товары категории пропадут с сайта.
    try {
      const next = existing.map((c) => (c.key === fromKey ? { ...c, key: toKey } : c))
      await saveCategoriesToSheet(sheetId, next)
    } catch (e: any) {
      logger.error({ fromKey, toKey, error: e?.message }, 'не удалось записать новый ключ — откатываем имя листа')
      try {
        await renameCategorySheet(sheetId, toKey, fromKey)
      } catch (rollbackError: any) {
        logger.error({ fromKey, toKey, error: rollbackError?.message }, 'откат имени листа не удался')
      }
      throw e
    }

    invalidateCategoriesCache()
    invalidateProductsCache()
    logger.info({ fromKey, toKey }, 'ключ категории изменён')
    return res.json({ success: true, key: toKey })
  } catch (error: any) {
    const msg = error?.message === 'sheet_name_taken' ? 'key_exists' : (error?.message || 'Ошибка переименования категории')
    logger.error({ error: error?.message }, 'ошибка переименования категории')
    return res.status(msg === 'key_exists' ? 409 : 500).json({ error: msg })
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
