import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Редактор текстов с поддержкой:
 *   - кнопка «Розовый» — оборачивает/снимает выделение `[[...]]`
 *   - живой preview как на сайте (`[[…]]` → розовый, пустая строка → новый абзац)
 *   - индикатор объёма относительно оригинала
 *   - кнопка «Сбросить» (опционально)
 */

type Props = {
  value: string
  onChange: (next: string) => void
  /** оригинальный текст (для расчёта длины и подсказки) */
  originalText?: string
  /** одна строка вместо textarea (для коротких полей) */
  singleLine?: boolean
  placeholder?: string
  rows?: number
}

const ACCENT_RE = /\[\[([\s\S]+?)\]\]/g

function plainLen(s: string): number {
  return s.replace(/\[\[|\]\]/g, '').replace(/\r\n/g, '\n').length
}

function textWithBreaks(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split('\n')
  const out: ReactNode[] = []
  parts.forEach((p, i) => {
    if (i > 0) out.push(<br key={`${keyPrefix}-br${i}`} />)
    if (p) out.push(<Fragment key={`${keyPrefix}-t${i}`}>{p}</Fragment>)
  })
  return out
}

function parseParagraph(para: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  ACCENT_RE.lastIndex = 0
  while ((m = ACCENT_RE.exec(para)) !== null) {
    if (m.index > last) out.push(...textWithBreaks(para.slice(last, m.index), `${keyPrefix}-pre${i}`))
    out.push(
      <span key={`${keyPrefix}-a${i}`} className="rte-accent">
        {textWithBreaks(m[1], `${keyPrefix}-a${i}-in`)}
      </span>
    )
    last = m.index + m[0].length
    i++
  }
  if (last < para.length) out.push(...textWithBreaks(para.slice(last), `${keyPrefix}-end`))
  return out
}

function Preview({ text }: { text: string }) {
  if (!text) return <div className="rte-preview-empty">— пусто —</div>
  const paragraphs = text.replace(/\r\n/g, '\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  return (
    <>
      {paragraphs.map((para, pi) => (
        <p key={pi}>{parseParagraph(para, String(pi))}</p>
      ))}
    </>
  )
}

export default function RichTextEditor({
  value, onChange, originalText, singleLine, placeholder, rows = 6,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [, setTick] = useState(0) // принудительный rerender при изменении selection
  const ref = singleLine ? inputRef : textareaRef

  const handleAccent = () => {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? 0
    if (start === end) return // нет выделения
    const before = value.slice(0, start)
    const sel = value.slice(start, end)
    const after = value.slice(end)
    // если выделение уже окружено [[...]] — снимаем
    const wrappedAround = before.endsWith('[[') && after.startsWith(']]')
    const selStartsWithMarker = sel.startsWith('[[') && sel.endsWith(']]')

    if (wrappedAround) {
      const next = before.slice(0, -2) + sel + after.slice(2)
      onChange(next)
      requestAnimationFrame(() => {
        const newPos = start - 2
        el.focus()
        el.setSelectionRange(newPos, newPos + sel.length)
      })
    } else if (selStartsWithMarker) {
      const inner = sel.slice(2, -2)
      const next = before + inner + after
      onChange(next)
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(start, start + inner.length)
      })
    } else {
      const next = `${before}[[${sel}]]${after}`
      onChange(next)
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(start, end + 4)
      })
    }
  }

  useEffect(() => {
    // отслеживаем выделение — для disabled-стейта кнопки
    const el = ref.current
    if (!el) return
    const handler = () => setTick((t) => t + 1)
    el.addEventListener('select', handler)
    el.addEventListener('keyup', handler)
    el.addEventListener('mouseup', handler)
    el.addEventListener('focus', handler)
    return () => {
      el.removeEventListener('select', handler)
      el.removeEventListener('keyup', handler)
      el.removeEventListener('mouseup', handler)
      el.removeEventListener('focus', handler)
    }
  }, [ref])

  const sel = ref.current ? (ref.current.selectionEnd ?? 0) - (ref.current.selectionStart ?? 0) : 0
  const hasSelection = sel > 0

  // индикатор объёма
  let countState: 'ok' | 'warn' | 'bad' | 'none' = 'none'
  let countLabel = ''
  if (originalText) {
    const origLen = plainLen(originalText)
    const curLen = plainLen(value)
    const delta = origLen ? (curLen - origLen) / origLen : 0
    const pct = Math.round(delta * 100)
    const sign = pct >= 0 ? '+' : ''
    if (origLen === 0) {
      countLabel = `Сейчас: ${curLen}`
      countState = 'ok'
    } else if (Math.abs(pct) <= 20) {
      countLabel = `Оригинал: ${origLen} символов · Сейчас: ${curLen} (${sign}${pct}%)`
      countState = 'ok'
    } else if (Math.abs(pct) <= 50) {
      countLabel = `Оригинал: ${origLen} · Сейчас: ${curLen} (${sign}${pct}%) — отклоняется от оригинала`
      countState = 'warn'
    } else {
      countLabel = `Оригинал: ${origLen} · Сейчас: ${curLen} (${sign}${pct}%) — может сломать вёрстку`
      countState = 'bad'
    }
  }

  return (
    <div className="rte">
      <div className="rte-toolbar">
        <button
          type="button"
          className="rte-btn-accent"
          disabled={!hasSelection}
          onClick={handleAccent}
          title={hasSelection ? 'Покрасить выделенный текст в розовый (или снять)' : 'Выделите текст, чтобы покрасить его'}
        >
          <span className="rte-btn-dot" /> Розовый
        </button>
        <span className="rte-toolbar-hint">
          Выделите текст и нажмите «Розовый». Двойной перенос — новый абзац.
        </span>
      </div>

      {singleLine ? (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="rte-input"
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="rte-textarea"
        />
      )}

      {countLabel && (
        <div className={`rte-count rte-count-${countState}`}>{countLabel}</div>
      )}

      <div className="rte-preview-label">Превью</div>
      <div className="rte-preview">
        <Preview text={value} />
      </div>
    </div>
  )
}
