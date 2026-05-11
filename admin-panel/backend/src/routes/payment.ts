import { Router, Request, Response } from 'express'
import { createPaymentUrl, verifyResultSignature, verifySuccessSignature, buildReceipt } from '../robokassa.js'
import { findOrderByInvId, updateOrderStatus, decrementStockForOrder, getAuth } from '../orders-utils.js'
import { logger } from '../logger.js'

const router = Router()

/**
 * POST /api/payment/create
 * Создаёт ссылку на оплату.
 *
 * Body: { outSum, invId?, description?, email?, items?: [{name, quantity, price}], shpParams? }
 */
router.post('/create', (req: Request, res: Response) => {
  try {
    const { outSum, invId, description, email, items, shpParams } = req.body

    if (!outSum || typeof outSum !== 'number' || outSum <= 0) {
      res.status(400).json({ error: 'outSum обязателен и должен быть > 0' })
      return
    }

    // Формируем чек если переданы товары
    const receipt = items?.length ? buildReceipt(items) : undefined

    const result = createPaymentUrl({
      outSum,
      invId,
      description,
      email,
      receipt,
      shpParams,
    })

    res.json(result)
  } catch (err: any) {
    logger.error({ err: err.message }, 'ошибка создания платежа')
    res.status(500).json({ error: 'Ошибка создания платежа' })
  }
})

/**
 * POST /api/payment/result
 * Result URL — серверное уведомление от Робокассы об успешной оплате.
 * Робокасса ожидает ответ OK{InvId}
 */
router.post('/result', async (req: Request, res: Response) => {
  try {
    const { OutSum, InvId, SignatureValue, ...rest } = req.body

    if (!OutSum || !InvId || !SignatureValue) {
      logger.warn({ body: req.body }, 'Result URL: отсутствуют обязательные параметры')
      res.status(400).send('bad request')
      return
    }

    // Собираем Shp_ параметры
    const shpParams: Record<string, string> = {}
    for (const [key, value] of Object.entries(rest)) {
      if (key.startsWith('Shp_') || key.startsWith('shp_')) {
        shpParams[key] = String(value)
      }
    }

    const isValid = verifyResultSignature(
      String(OutSum),
      String(InvId),
      String(SignatureValue),
      Object.keys(shpParams).length > 0 ? shpParams : undefined
    )

    if (!isValid) {
      logger.warn({ InvId, OutSum }, 'Result URL: невалидная подпись')
      res.status(400).send('bad sign')
      return
    }

    // ищем заказ по inv_id и переводим в статус "new" (оплачен)
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (sheetId) {
      try {
        const auth = getAuth()
        const invIdNum = Number(InvId)
        const order = await findOrderByInvId(auth, sheetId, invIdNum)
        if (order) {
          if (order.status === 'pending_payment') {
            await updateOrderStatus(auth, sheetId, order.id, 'new')
            logger.info({ orderId: order.id, InvId }, 'заказ переведён в new (оплачен)')
            // уменьшаем остатки только один раз — при переходе pending_payment → new
            try {
              await decrementStockForOrder(auth, sheetId, order.id)
            } catch (stockErr: any) {
              logger.error({ err: stockErr?.message, orderId: order.id }, 'не удалось уменьшить stock')
            }
          } else {
            logger.warn({ orderId: order.id, status: order.status, InvId }, 'заказ уже не в pending_payment, статус не меняем')
          }
        } else {
          logger.warn({ InvId }, 'заказ по inv_id не найден')
        }
      } catch (e: any) {
        logger.error({ err: e?.message, InvId }, 'не удалось обновить статус заказа')
      }
    }

    logger.info({ InvId, OutSum }, 'оплата подтверждена Робокассой')

    // Робокасса ожидает именно такой формат ответа
    res.send(`OK${InvId}`)
  } catch (err: any) {
    logger.error({ err: err.message }, 'ошибка обработки Result URL')
    res.status(500).send('internal error')
  }
})

/**
 * GET/POST /api/payment/success
 * Success URL — редирект покупателя после успешной оплаты.
 */
router.all('/success', (req: Request, res: Response) => {
  const params = { ...req.query, ...req.body }
  const { OutSum, InvId, SignatureValue } = params

  if (OutSum && InvId && SignatureValue) {
    const shpParams: Record<string, string> = {}
    for (const [key, value] of Object.entries(params)) {
      if (typeof key === 'string' && (key.startsWith('Shp_') || key.startsWith('shp_'))) {
        shpParams[key] = String(value)
      }
    }

    const isValid = verifySuccessSignature(
      String(OutSum),
      String(InvId),
      String(SignatureValue),
      Object.keys(shpParams).length > 0 ? shpParams : undefined
    )

    if (!isValid) {
      logger.warn({ InvId }, 'Success URL: невалидная подпись')
    }
  }

  // Редирект на фронтенд (страницу успешной оплаты)
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  res.redirect(`${frontendUrl}/payment/success?invId=${InvId || ''}`)
})

/**
 * GET/POST /api/payment/fail
 * Fail URL — редирект покупателя после неудачной оплаты.
 */
router.all('/fail', (req: Request, res: Response) => {
  const params = { ...req.query, ...req.body }
  const { InvId } = params

  logger.info({ InvId }, 'покупатель вернулся после неудачной оплаты')

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  res.redirect(`${frontendUrl}/payment/fail?invId=${InvId || ''}`)
})

export default router
