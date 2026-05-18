import express from 'express'
import { generateToken, verifyPasswordHash } from '../auth.js'
import { fetchAdminCreds } from '../settings-utils.js'
import { loginLimiter } from '../rate-limit.js'
import pino from 'pino'

const logger = pino()
const router = express.Router()

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'invalid_request' })
    }

    // 1) пробуем найти учётку в Sheets (settings-лист)
    const sheetId = process.env.GOOGLE_SHEET_ID
    let ok = false
    let effectiveUsername = ''

    if (sheetId) {
      try {
        const creds = await fetchAdminCreds(sheetId)
        if (creds) {
          if (username === creds.username && verifyPasswordHash(password, creds.passwordHash)) {
            ok = true
            effectiveUsername = creds.username
          }
        }
      } catch (err: any) {
        logger.warn({ err: err?.message }, 'не удалось прочесть admin creds из Sheets')
      }
    }

    // 2) фолбэк на .env — если в Sheets ничего нет (или не совпало)
    if (!ok) {
      const envUser = process.env.ADMIN_USERNAME || 'admin'
      const envPass = process.env.ADMIN_PASSWORD || 'admin'
      if (username === envUser && password === envPass) {
        ok = true
        effectiveUsername = envUser
      }
    }

    if (!ok) {
      logger.warn({ username }, 'неудачная попытка входа')
      return res.status(401).json({ error: 'invalid_credentials' })
    }

    const token = generateToken({ userId: '1', username: effectiveUsername })
    logger.info({ username: effectiveUsername }, 'успешный вход в админ-панель')
    res.json({ token })
  } catch (error: any) {
    logger.error({ error: error?.message }, 'ошибка при входе')
    res.status(500).json({ error: 'login_failed' })
  }
})

export default router
