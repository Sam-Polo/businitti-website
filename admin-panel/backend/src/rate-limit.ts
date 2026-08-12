import rateLimit from 'express-rate-limit'

// Лимит на попытки входа в админку — защита от brute force на пароль
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'too_many_attempts' },
})

// Лимит на создание заказов — защита от спама/флуда
export const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'too_many_orders' },
})

// Лимит на страницу перехода к оплате: каждый заход читает заказ из Sheets.
// Запас большой — покупатель может открывать ссылку несколько раз (и повторно из письма).
export const paymentPageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Слишком много запросов, попробуйте позже',
})
