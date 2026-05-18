import express from 'express'
import { requireAuth } from '../auth.js'
import { logger } from '../logger.js'
import { CONTENT_SLOTS, getSlotByKey } from '../site-content-manifest.js'
import { fetchOverridesMap, upsertOverride, deleteOverride } from '../site-content-utils.js'
import { invalidateContentCache } from './public.js'

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

// GET /api/content — список всех слотов с текущими значениями (override или null)
router.get('/', async (_req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const overrides = await fetchOverridesMap(sheetId)
    const slots = CONTENT_SLOTS.map((s) => ({
      ...s,
      value: overrides[s.key] || '',
      isOverridden: !!overrides[s.key],
    }))
    res.json({ slots })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка загрузки контента')
    res.status(500).json({ error: 'failed_to_load_content' })
  }
})

// PUT /api/content/:key — обновить значение слота
router.put('/:key', async (req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const key = String(req.params.key || '').trim()
    const slot = getSlotByKey(key)
    if (!slot) return res.status(404).json({ error: 'unknown_slot' })
    const value = String(req.body?.value ?? '').trim()
    if (!value) return res.status(400).json({ error: 'value_required' })
    await upsertOverride(sheetId, key, value)
    invalidateContentCache()
    res.json({ ok: true })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка обновления контента')
    res.status(500).json({ error: 'failed_to_update_content' })
  }
})

// DELETE /api/content/:key — сбросить к дефолтному значению (удалить override)
router.delete('/:key', async (req, res) => {
  try {
    const sheetId = getSheetId(res); if (!sheetId) return
    const key = String(req.params.key || '').trim()
    const slot = getSlotByKey(key)
    if (!slot) return res.status(404).json({ error: 'unknown_slot' })
    await deleteOverride(sheetId, key)
    invalidateContentCache()
    res.json({ ok: true })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка сброса контента')
    res.status(500).json({ error: 'failed_to_reset_content' })
  }
})

export default router
