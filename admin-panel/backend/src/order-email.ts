import type { OrderWithItems } from './orders-utils.js'
import { DELIVERY_LABELS } from './orders-utils.js'


// ─── Утилиты ────────────────────────────────────────────

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatPrice(rub: number): string {
  return `${Math.round(rub).toLocaleString('ru-RU')} ₽`
}

// ─── Контакты для подписи (из env) ──────────────────────

function getContacts() {
  return {
    siteUrl: process.env.SITE_URL || 'https://businitti.ru',
    supportEmail: process.env.SUPPORT_EMAIL || '',
    supportPhone: process.env.SUPPORT_PHONE || '',
    supportLink: process.env.SUPPORT_LINK || '',
  }
}

// ─── Шаблон письма (table-based для совместимости с почтовиками) ──

export function buildOrderEmailHtml(order: OrderWithItems): string {
  const contacts = getContacts()
  const itemsSum = order.items.reduce((s, it) => s + it.subtotal_rub, 0)

  const itemRows = order.items
    .map(
      (it) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #ececec; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #2f2f2f;">
            <div style="font-weight: 500;">${escapeHtml(it.product_title)}</div>
            <div style="font-size: 13px; color: #888; margin-top: 2px;">${it.quantity} шт × ${formatPrice(it.price_rub)}</div>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #ececec; text-align: right; vertical-align: top; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #2f2f2f; white-space: nowrap;">
            ${formatPrice(it.subtotal_rub)}
          </td>
        </tr>
      `
    )
    .join('')

  const contactsBlock = [
    contacts.supportPhone ? `<a href="tel:${escapeHtml(contacts.supportPhone.replace(/\s+/g, ''))}" style="color: #2f2f2f; text-decoration: none;">${escapeHtml(contacts.supportPhone)}</a>` : '',
    contacts.supportEmail ? `<a href="mailto:${escapeHtml(contacts.supportEmail)}" style="color: #2f2f2f; text-decoration: none;">${escapeHtml(contacts.supportEmail)}</a>` : '',
    contacts.supportLink ? `<a href="${escapeHtml(contacts.supportLink)}" style="color: #2f2f2f; text-decoration: none;">Написать в мессенджер</a>` : '',
  ]
    .filter(Boolean)
    .join(' &nbsp;·&nbsp; ')

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Заказ #${order.display_id}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fffdfd; font-family: 'Helvetica Neue', Arial, sans-serif; color: #2f2f2f;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fffdfd; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border: 1px solid #ececec;">

          <!-- header -->
          <tr>
            <td style="padding: 40px 40px 24px; text-align: center; border-bottom: 1px solid #f5a2b7;">
              <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 32px; letter-spacing: 0.12em; color: #2f2f2f;">BUSINITTI</div>
            </td>
          </tr>

          <!-- title -->
          <tr>
            <td style="padding: 36px 40px 8px; text-align: center;">
              <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: normal; color: #2f2f2f;">Спасибо за заказ!</h1>
              <p style="margin: 12px 0 0; font-size: 15px; color: #888;">Заказ <strong style="color: #2f2f2f;">#${order.display_id}</strong> принят и оплачен</p>
            </td>
          </tr>

          <!-- items -->
          <tr>
            <td style="padding: 28px 40px 0;">
              <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 12px;">Состав заказа</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${itemRows}
              </table>
            </td>
          </tr>

          <!-- totals -->
          <tr>
            <td style="padding: 16px 40px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #888;">Товары</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #888; text-align: right;">${formatPrice(itemsSum)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #888;">${escapeHtml(DELIVERY_LABELS[order.delivery_service])}</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #888; text-align: right;">${formatPrice(order.delivery_rub)}</td>
                </tr>
                <tr>
                  <td colspan="2" style="border-top: 1px solid #ececec; padding-top: 12px;"></td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 17px; color: #2f2f2f; font-weight: 500;">Итого</td>
                  <td style="padding: 4px 0; font-size: 17px; color: #2f2f2f; font-weight: 500; text-align: right;">${formatPrice(order.total_rub)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- delivery -->
          <tr>
            <td style="padding: 32px 40px 0;">
              <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 12px;">Доставка</div>
              <div style="font-size: 15px; line-height: 22px; color: #2f2f2f;">
                ${escapeHtml(DELIVERY_LABELS[order.delivery_service])}<br>
                <span style="color: #888;">${escapeHtml(order.delivery_address)}</span>
              </div>
            </td>
          </tr>

          <!-- notice -->
          <tr>
            <td style="padding: 32px 40px 0;">
              <div style="background-color: rgba(245, 162, 183, 0.10); border-left: 3px solid #f5a2b7; padding: 16px 18px; font-size: 14px; line-height: 21px; color: #2f2f2f;">
                Мы соберём и отправим заказ в течение <strong>2&ndash;5 дней</strong>.
                Когда посылка уйдёт в службу доставки — пришлём трек-номер на этот же email.
              </div>
            </td>
          </tr>

          <!-- contacts -->
          ${contactsBlock ? `
          <tr>
            <td style="padding: 32px 40px 0; text-align: center;">
              <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 10px;">Связь с нами</div>
              <div style="font-size: 14px; color: #2f2f2f;">${contactsBlock}</div>
            </td>
          </tr>
          ` : ''}

          <!-- footer -->
          <tr>
            <td style="padding: 40px 40px 32px; text-align: center;">
              <a href="${escapeHtml(contacts.siteUrl)}" style="font-family: Georgia, 'Times New Roman', serif; font-size: 14px; letter-spacing: 0.12em; color: #888; text-decoration: none;">${escapeHtml(contacts.siteUrl.replace(/^https?:\/\//, ''))}</a>
            </td>
          </tr>

        </table>

        <div style="margin-top: 16px; font-size: 12px; color: #aaa; text-align: center;">
          Это автоматическое уведомление. Отвечать на него не нужно.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildOrderEmailSubject(order: OrderWithItems): string {
  return `Заказ #${order.display_id} оплачен — Businitti`
}

// ─── Письмо об отправке заказа ───────────────────────────

const TRACKING_URLS: Record<string, (n: string) => string> = {
  cdek: (n) => `https://www.cdek.ru/ru/tracking?order_id=${encodeURIComponent(n)}`,
  yandex_market: (n) => `https://market.yandex.ru/my/orders?text=${encodeURIComponent(n)}`,
}

export function buildShippingEmailHtml(order: OrderWithItems, trackingNumber: string): string {
  const contacts = getContacts()
  const deliveryLabel = DELIVERY_LABELS[order.delivery_service] ?? order.delivery_service
  const trackingUrl = TRACKING_URLS[order.delivery_service]?.(trackingNumber)

  const trackingBlock = trackingUrl
    ? `<a href="${escapeHtml(trackingUrl)}" style="display:inline-block;margin-top:12px;padding:10px 24px;background:#f5a2b7;color:#fff;text-decoration:none;font-size:14px;border-radius:3px;">Отследить посылку</a>`
    : ''

  const contactsBlock = [
    contacts.supportPhone ? `<a href="tel:${escapeHtml(contacts.supportPhone.replace(/\s+/g, ''))}" style="color: #2f2f2f; text-decoration: none;">${escapeHtml(contacts.supportPhone)}</a>` : '',
    contacts.supportEmail ? `<a href="mailto:${escapeHtml(contacts.supportEmail)}" style="color: #2f2f2f; text-decoration: none;">${escapeHtml(contacts.supportEmail)}</a>` : '',
    contacts.supportLink ? `<a href="${escapeHtml(contacts.supportLink)}" style="color: #2f2f2f; text-decoration: none;">Написать в мессенджер</a>` : '',
  ].filter(Boolean).join(' &nbsp;·&nbsp; ')

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Заказ #${order.display_id} отправлен</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fffdfd; font-family: 'Helvetica Neue', Arial, sans-serif; color: #2f2f2f;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fffdfd; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border: 1px solid #ececec;">

          <!-- header -->
          <tr>
            <td style="padding: 40px 40px 24px; text-align: center; border-bottom: 1px solid #f5a2b7;">
              <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 32px; letter-spacing: 0.12em; color: #2f2f2f;">BUSINITTI</div>
            </td>
          </tr>

          <!-- title -->
          <tr>
            <td style="padding: 36px 40px 8px; text-align: center;">
              <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: normal; color: #2f2f2f;">Ваш заказ отправлен!</h1>
              <p style="margin: 12px 0 0; font-size: 15px; color: #888;">Заказ <strong style="color: #2f2f2f;">#${order.display_id}</strong> передан в службу доставки</p>
            </td>
          </tr>

          <!-- tracking -->
          <tr>
            <td style="padding: 32px 40px 0; text-align: center;">
              <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 10px;">Трек-номер</div>
              <div style="font-size: 22px; font-weight: 600; letter-spacing: 0.06em; color: #2f2f2f;">${escapeHtml(trackingNumber)}</div>
              <div style="font-size: 13px; color: #888; margin-top: 4px;">${escapeHtml(deliveryLabel)}</div>
              ${trackingBlock}
            </td>
          </tr>

          <!-- delivery address -->
          <tr>
            <td style="padding: 32px 40px 0;">
              <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 10px;">Адрес доставки</div>
              <div style="font-size: 15px; color: #2f2f2f;">${escapeHtml(order.delivery_address)}</div>
            </td>
          </tr>

          <!-- notice -->
          <tr>
            <td style="padding: 32px 40px 0;">
              <div style="background-color: rgba(245, 162, 183, 0.10); border-left: 3px solid #f5a2b7; padding: 16px 18px; font-size: 14px; line-height: 21px; color: #2f2f2f;">
                Обычно посылки доставляются в течение <strong>2&ndash;7 рабочих дней</strong> с момента отправки. Следите за статусом по трек-номеру выше.
              </div>
            </td>
          </tr>

          <!-- contacts -->
          ${contactsBlock ? `
          <tr>
            <td style="padding: 32px 40px 0; text-align: center;">
              <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 10px;">Связь с нами</div>
              <div style="font-size: 14px; color: #2f2f2f;">${contactsBlock}</div>
            </td>
          </tr>
          ` : ''}

          <!-- footer -->
          <tr>
            <td style="padding: 40px 40px 32px; text-align: center;">
              <a href="${escapeHtml(contacts.siteUrl)}" style="font-family: Georgia, 'Times New Roman', serif; font-size: 14px; letter-spacing: 0.12em; color: #888; text-decoration: none;">${escapeHtml(contacts.siteUrl.replace(/^https?:\/\//, ''))}</a>
            </td>
          </tr>

        </table>

        <div style="margin-top: 16px; font-size: 12px; color: #aaa; text-align: center;">
          Это автоматическое уведомление. Отвечать на него не нужно.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildShippingEmailSubject(order: OrderWithItems): string {
  return `Заказ #${order.display_id} отправлен — Businitti`
}
