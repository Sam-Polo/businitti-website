import crypto from 'node:crypto'
import { logger } from './logger.js'

// ─── Типы ────────────────────────────────────────────────

export type ReceiptItem = {
  name: string
  quantity: number
  sum: number
  tax: 'none' | 'vat0' | 'vat10' | 'vat20' | 'vat110' | 'vat120'
  payment_method?: 'full_payment' | 'full_prepayment' | 'prepayment' | 'advance' | 'partial_payment' | 'credit' | 'credit_payment'
  payment_object?: 'commodity' | 'excise' | 'job' | 'service' | 'gambling_bet' | 'gambling_prize' | 'lottery' | 'lottery_prize' | 'intellectual_activity' | 'payment' | 'agent_commission' | 'another'
}

export type Receipt = {
  items: ReceiptItem[]
}

export type CreatePaymentParams = {
  outSum: number
  invId?: number
  description?: string
  email?: string
  receipt?: Receipt
  /** Дополнительные Shp_ параметры */
  shpParams?: Record<string, string>
}

export type PaymentResult = {
  paymentUrl: string
  invId?: number
}

// ─── Конфигурация ────────────────────────────────────────

/**
 * При TEST_MODE=1 используются ТЕСТОВЫЕ пароли из вкладки "Тестовые пароли"
 * в личном кабинете Робокассы. При TEST_MODE=0 — боевые пароли.
 * URL для оплаты у тестового и боевого режимов одинаковый — отличается только IsTest=1
 * и набор паролей. Боевые пароли в тестовом режиме вызовут ошибку 29.
 */
function getConfig() {
  const login = process.env.ROBOKASSA_LOGIN
  const isTest = process.env.ROBOKASSA_TEST_MODE === '1'

  const password1 = isTest
    ? process.env.ROBOKASSA_TEST_PASSWORD1
    : process.env.ROBOKASSA_PASSWORD1
  const password2 = isTest
    ? process.env.ROBOKASSA_TEST_PASSWORD2
    : process.env.ROBOKASSA_PASSWORD2

  if (!login) throw new Error('ROBOKASSA_LOGIN обязателен в .env')
  if (!password1 || !password2) {
    const suffix = isTest ? 'TEST_PASSWORD1/TEST_PASSWORD2' : 'PASSWORD1/PASSWORD2'
    throw new Error(`ROBOKASSA_${suffix} обязательны в .env (TEST_MODE=${isTest ? '1' : '0'})`)
  }

  return { login, password1, password2, isTest }
}

const PAYMENT_URL = 'https://auth.robokassa.ru/Merchant/Index.aspx'

// ─── Утилиты подписи ────────────────────────────────────

/**
 * Сортирует Shp_ параметры по алфавиту и возвращает строку вида :Shp_key1=val1:Shp_key2=val2
 */
function formatShpParams(shpParams?: Record<string, string>): string {
  if (!shpParams || Object.keys(shpParams).length === 0) return ''
  return Object.keys(shpParams)
    .sort()
    .map(key => `:${key}=${shpParams[key]}`)
    .join('')
}

/**
 * MD5 хеш строки
 */
function md5(data: string): string {
  return crypto.createHash('md5').update(data).digest('hex')
}

// ─── Генерация ссылки на оплату ─────────────────────────

/**
 * Создаёт URL для перенаправления покупателя на страницу оплаты Робокассы
 */
export function createPaymentUrl(params: CreatePaymentParams): PaymentResult {
  const { login, password1, isTest } = getConfig()

  const outSum = params.outSum.toFixed(2)
  const invIdPart = params.invId !== undefined ? String(params.invId) : ''

  // Формирование подписи: MerchantLogin:OutSum:InvId[:Receipt]:Password#1[:Shp_*]
  let signParts = `${login}:${outSum}:${invIdPart}`

  if (params.receipt) {
    const receiptJson = JSON.stringify(params.receipt)
    signParts += `:${receiptJson}`
  }

  signParts += `:${password1}`
  signParts += formatShpParams(params.shpParams)

  const signature = md5(signParts)

  // Формирование URL
  const urlParams = new URLSearchParams()
  urlParams.set('MerchantLogin', login)
  urlParams.set('OutSum', outSum)
  if (params.invId !== undefined) {
    urlParams.set('InvId', String(params.invId))
  }
  urlParams.set('SignatureValue', signature)

  if (params.description) {
    urlParams.set('Description', params.description)
  }
  if (params.email) {
    urlParams.set('Email', params.email)
  }
  if (params.receipt) {
    // URLSearchParams сам сделает URL-encoding при toString() — передаём сырой JSON
    urlParams.set('Receipt', JSON.stringify(params.receipt))
  }
  if (isTest) {
    urlParams.set('IsTest', '1')
  }

  // Shp_ параметры
  if (params.shpParams) {
    for (const [key, value] of Object.entries(params.shpParams)) {
      urlParams.set(key, value)
    }
  }

  const paymentUrl = `${PAYMENT_URL}?${urlParams.toString()}`

  logger.info({ invId: params.invId, outSum, isTest }, 'создана ссылка на оплату Робокассы')

  return { paymentUrl, invId: params.invId }
}

// ─── Проверка подписи Result URL ────────────────────────

/**
 * Проверяет подпись серверного уведомления от Робокассы (Result URL).
 * Подпись: OutSum:InvId:Пароль#2[:Shp_*]
 */
export function verifyResultSignature(
  outSum: string,
  invId: string,
  signatureValue: string,
  shpParams?: Record<string, string>
): boolean {
  const { password2 } = getConfig()

  let signString = `${outSum}:${invId}:${password2}`
  signString += formatShpParams(shpParams)

  const expected = md5(signString)
  const isValid = expected.toLowerCase() === signatureValue.toLowerCase()

  if (!isValid) {
    logger.warn({ invId, outSum }, 'невалидная подпись Result URL от Робокассы')
  }

  return isValid
}

// ─── Проверка подписи Success URL ───────────────────────

/**
 * Проверяет подпись редиректа на Success URL.
 * Подпись: OutSum:InvId:Пароль#1[:Shp_*]
 */
export function verifySuccessSignature(
  outSum: string,
  invId: string,
  signatureValue: string,
  shpParams?: Record<string, string>
): boolean {
  const { password1 } = getConfig()

  let signString = `${outSum}:${invId}:${password1}`
  signString += formatShpParams(shpParams)

  const expected = md5(signString)
  return expected.toLowerCase() === signatureValue.toLowerCase()
}

// ─── Формирование чека для самозанятого ─────────────────

/**
 * Создаёт Receipt для самозанятого (tax: "none", без sno).
 * delivery — отдельная позиция чека (payment_object: 'service').
 */
export function buildReceipt(
  items: { name: string; quantity: number; price: number }[],
  delivery?: { name: string; price: number }
): Receipt {
  const positions: ReceiptItem[] = items.map(item => ({
    name: item.name.slice(0, 128),
    quantity: item.quantity,
    sum: +(item.price * item.quantity).toFixed(2),
    tax: 'none',
    payment_method: 'full_payment',
    payment_object: 'commodity',
  }))

  if (delivery && delivery.price > 0) {
    positions.push({
      name: delivery.name.slice(0, 128),
      quantity: 1,
      sum: +delivery.price.toFixed(2),
      tax: 'none',
      payment_method: 'full_payment',
      payment_object: 'service',
    })
  }

  return { items: positions }
}
