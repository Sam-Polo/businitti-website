import type { OrderWithItems } from './orders-utils.js'
import { DELIVERY_LABELS } from './orders-utils.js'
import type { SiteContentMap } from './site-content-utils.js'
import {
  ORIG_EMAIL_PAID_HEADING,
  ORIG_EMAIL_PAID_NOTICE,
  ORIG_EMAIL_SHIPPED_HEADING,
  ORIG_EMAIL_SHIPPED_NOTICE,
  ORIG_EMAIL_FOOTER_NOTE,
} from './site-content-manifest.js'

export type EmailOptions = {
  messengerLink?: string
  supportPhone?: string
  /** переопределения контента из админки (лист site_content); без них берутся тексты по умолчанию */
  content?: SiteContentMap
}

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

// ─── Редактируемые тексты писем ─────────────────────────

const ACCENT_COLOR = '#f5a2b7'

/** текст слота из админки; пустой/отсутствующий override — фолбэк из манифеста */
function slotText(options: EmailOptions | undefined, key: string, fallback: string): string {
  const value = options?.content?.[key]
  return value && value.trim() ? value.trim() : fallback
}

/**
 * Разметка как в текстах на сайте (`RichText`): `[[…]]` → розовый акцент,
 * одиночный перенос строки → `<br>`. Экранируем до подстановки тегов —
 * текст приходит из админки и в письмо попадает как есть.
 *
 * `boldAccent` — для мелкого текста на розовой плашке: там розовый на розовом
 * читается слабо, поэтому акцент ещё и полужирный (раньше в этом месте был `<strong>`).
 */
function inlineHtml(text: string, opts: { boldAccent?: boolean } = {}): string {
  const style = opts.boldAccent
    ? `color: ${ACCENT_COLOR}; font-weight: 600;`
    : `color: ${ACCENT_COLOR};`
  return escapeHtml(text.replace(/\r\n/g, '\n').trim())
    .replace(/\n/g, '<br>')
    .replace(/\[\[([\s\S]+?)\]\]/g, `<span style="${style}">$1</span>`)
}

/** то же, но пустая строка разбивает текст на абзацы */
function richHtml(text: string, opts: { boldAccent?: boolean } = {}): string {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p, i) => `<div style="${i > 0 ? 'margin-top: 10px;' : ''}">${inlineHtml(p, opts)}</div>`)
    .join('')
}

// ─── Контакты для подписи (из env) ──────────────────────

function getContacts(options?: EmailOptions) {
  return {
    siteUrl: process.env.SITE_URL || 'https://businitti.ru',
    supportEmail: process.env.SUPPORT_EMAIL || '',
    supportPhone: options?.supportPhone || process.env.SUPPORT_PHONE || '',
    supportLink: options?.messengerLink || process.env.SUPPORT_LINK || '',
  }
}

/** мелкая строка под письмом — одинаковая в обоих шаблонах */
function footerNoteBlock(options?: EmailOptions): string {
  const note = slotText(options, 'email.footer_note', ORIG_EMAIL_FOOTER_NOTE)
  if (!note) return ''
  return `
        <div style="margin-top: 16px; font-size: 12px; color: #aaa; text-align: center;">
          ${inlineHtml(note)}
        </div>`
}

/** розовая плашка с текстом из админки */
function noticeBlock(options: EmailOptions | undefined, key: string, fallback: string): string {
  const notice = slotText(options, key, fallback)
  if (!notice) return ''
  return `
          <tr>
            <td style="padding: 32px 40px 0;">
              <div style="background-color: rgba(245, 162, 183, 0.10); border-left: 3px solid #f5a2b7; padding: 16px 18px; font-size: 14px; line-height: 21px; color: #2f2f2f;">
                ${richHtml(notice, { boldAccent: true })}
              </div>
            </td>
          </tr>`
}

// ─── Шаблон письма (table-based для совместимости с почтовиками) ──

export function buildOrderEmailHtml(order: OrderWithItems, options?: EmailOptions): string {
  const contacts = getContacts(options)
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
    contacts.supportPhone ? `<a href="tel:${escapeHtml(contacts.supportPhone.replace(/[^\d+]/g, ''))}" style="color: #2f2f2f; text-decoration: none;">${escapeHtml(contacts.supportPhone)}</a>` : '',
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
              <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: normal; color: #2f2f2f;">${inlineHtml(slotText(options, 'email.paid.heading', ORIG_EMAIL_PAID_HEADING))}</h1>
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
          ${noticeBlock(options, 'email.paid.notice', ORIG_EMAIL_PAID_NOTICE)}

          <!-- comment -->
          ${order.comment ? `
          <tr>
            <td style="padding: 32px 40px 0;">
              <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 10px;">Комментарий к заказу</div>
              <div style="font-size: 15px; line-height: 22px; color: #2f2f2f;">${escapeHtml(order.comment)}</div>
            </td>
          </tr>
          ` : ''}

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
${footerNoteBlock(options)}
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

function isTrackingUrl(v: string): boolean {
  return /^https?:\/\//i.test(v.trim())
}

function isOurOrderRef(v: string): boolean {
  return v.trim().startsWith('#')
}

function buildTrackingSection(order: OrderWithItems, trackingValue: string): string {
  const value = trackingValue.trim()
  const deliveryLabel = DELIVERY_LABELS[order.delivery_service] ?? order.delivery_service

  const buttonHtml = (url: string) =>
    `<a href="${escapeHtml(url)}" style="display:inline-block;margin-top:16px;padding:10px 24px;background:#f5a2b7;color:#fff;text-decoration:none;font-size:14px;border-radius:3px;">Отследить посылку</a>`

  let title = 'Трек-номер'
  let displayValue = value
  let buttonBlock = ''
  let helperText = ''

  if (order.delivery_service === 'cdek') {
    const url = `https://www.cdek.ru/ru/tracking?order_id=${encodeURIComponent(value)}`
    buttonBlock = buttonHtml(url)
  } else if (order.delivery_service === 'yandex_market') {
    if (isTrackingUrl(value)) {
      title = 'Отслеживание'
      displayValue = ''
      buttonBlock = buttonHtml(value)
      helperText = 'Перейдите по ссылке, чтобы отследить статус доставки.'
    } else if (isOurOrderRef(value)) {
      title = 'Номер заказа Businitti'
      displayValue = value
      helperText = 'Посылка отправлена через Яндекс Маркет. Отследить её можно в приложении Яндекс Go или по ссылке из SMS от Яндекса. Этот номер сообщите нам, если возникнут вопросы.'
    } else {
      title = 'Номер заказа Яндекса'
      displayValue = value
      helperText = 'Отследить посылку можно в приложении Яндекс Go или по ссылке из SMS от Яндекса.'
    }
  }

  const displayBlock = displayValue
    ? `<div style="font-size: 22px; font-weight: 600; letter-spacing: 0.06em; color: #2f2f2f;">${escapeHtml(displayValue)}</div>`
    : ''

  const helperBlock = helperText
    ? `<div style="font-size: 13px; color: #888; margin-top: 10px; line-height: 19px;">${escapeHtml(helperText)}</div>`
    : ''

  return `
    <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 10px;">${escapeHtml(title)}</div>
    ${displayBlock}
    <div style="font-size: 13px; color: #888; margin-top: 4px;">${escapeHtml(deliveryLabel)}</div>
    ${buttonBlock}
    ${helperBlock}
  `
}

export function buildShippingEmailHtml(order: OrderWithItems, trackingNumber: string, options?: EmailOptions): string {
  const contacts = getContacts(options)
  const trackingSection = buildTrackingSection(order, trackingNumber)

  const contactsBlock = [
    contacts.supportPhone ? `<a href="tel:${escapeHtml(contacts.supportPhone.replace(/[^\d+]/g, ''))}" style="color: #2f2f2f; text-decoration: none;">${escapeHtml(contacts.supportPhone)}</a>` : '',
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
              <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: normal; color: #2f2f2f;">${inlineHtml(slotText(options, 'email.shipped.heading', ORIG_EMAIL_SHIPPED_HEADING))}</h1>
              <p style="margin: 12px 0 0; font-size: 15px; color: #888;">Заказ <strong style="color: #2f2f2f;">#${order.display_id}</strong> передан в службу доставки</p>
            </td>
          </tr>

          <!-- tracking -->
          <tr>
            <td style="padding: 32px 40px 0; text-align: center;">
              ${trackingSection}
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
          ${noticeBlock(options, 'email.shipped.notice', ORIG_EMAIL_SHIPPED_NOTICE)}

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
${footerNoteBlock(options)}
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildShippingEmailSubject(order: OrderWithItems): string {
  return `Заказ #${order.display_id} отправлен — Businitti`
}
