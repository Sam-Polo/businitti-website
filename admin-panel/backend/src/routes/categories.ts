import express from 'express'
import { requireAuth } from '../auth.js'
import {
  fetchCategoriesFromSheet,
  saveCategoriesToSheet,
  type Category
} from '../categories-utils.js'
import { invalidateCategoriesCache } from './public.js'
import pino from 'pino'

const logger = pino()
const router = express.Router()

router.use(requireAuth)

// получить все категории
router.get('/', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) {
      return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    }
    const categories = await fetchCategoriesFromSheet(sheetId)
    return res.json({ categories })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка загрузки категорий')
    return res.status(500).json({ error: error?.message || 'Ошибка загрузки категорий' })
  }
})

// сохранить категории (полная перезапись)
router.put('/', async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) {
      return res.status(500).json({ error: 'GOOGLE_SHEET_ID not configured' })
    }

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
        key: c.key.trim().toLowerCase(),
        title: (c.title || c.key).trim(),
        description: typeof c.description === 'string' ? c.description.trim() || undefined : undefined,
        image: (c.image || '').trim(),
        image_position: typeof c.image_position === 'string' ? c.image_position.trim() || 'center' : 'center',
        order: i
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

export default router
