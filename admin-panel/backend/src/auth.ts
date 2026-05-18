import jwt from 'jsonwebtoken'
import express from 'express'
import pino from 'pino'
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

const logger = pino()

// ===== Хэширование пароля (scrypt — встроенный модуль Node, без сторонних зависимостей) =====

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(plain, salt, 64).toString('hex')
  return `scrypt:${salt}:${hash}`
}

export function verifyPasswordHash(plain: string, stored: string): boolean {
  const parts = stored.split(':')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const [, salt, hash] = parts
  if (!salt || !hash) return false
  try {
    const test = scryptSync(plain, salt, 64).toString('hex')
    const a = Buffer.from(test, 'hex')
    const b = Buffer.from(hash, 'hex')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET не задан в переменных окружения')
}

// время жизни токена: 2 недели
const TOKEN_EXPIRES_IN = '14d'

export interface TokenPayload {
  userId: string
  username: string
}

// генерация JWT токена
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: TOKEN_EXPIRES_IN })
}

// проверка JWT токена
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string)
    if (typeof decoded === 'object' && decoded !== null && 'userId' in decoded && 'username' in decoded) {
      return decoded as TokenPayload
    }
    return null
  } catch (error: any) {
    logger.warn({ error: error?.message }, 'ошибка проверки JWT токена')
    return null
  }
}

// middleware для проверки авторизации
export function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const token = authHeader.substring(7)
  const payload = verifyToken(token)
  
  if (!payload) {
    return res.status(401).json({ error: 'invalid_token' })
  }

  // добавляем данные пользователя в запрос
  ;(req as any).user = payload
  next()
}

