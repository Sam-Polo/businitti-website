import { Fragment, type CSSProperties, type ReactNode } from 'react'

/**
 * Лёгкая разметка для текстов, редактируемых через админку.
 *
 *   - Пустая строка (двойной перенос) = новый абзац `<p>`.
 *   - Одиночный перенос строки = `<br />` внутри текущего абзаца.
 *   - `[[текст]]` = `<span class="accent">текст</span>` (розовый акцент).
 *     Маркер `[[ ... ]]` может занимать несколько строк внутри одного абзаца.
 *
 * React эскейпит `<`, `>`, `&` автоматически — инъекция HTML невозможна.
 */

type Props = {
  text: string
  paragraphClassName?: string
  /** Adds `reveal` class + CSS custom property `--i` to each paragraph for staggered scroll-reveal animation. */
  paragraphReveal?: boolean
}

const ACCENT_RE = /\[\[([\s\S]+?)\]\]/g

/** Разбивает строку на ноды: текст + <br /> для одиночных \n. */
function textWithBreaks(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split('\n')
  const out: ReactNode[] = []
  parts.forEach((p, i) => {
    if (i > 0) out.push(<br key={`${keyPrefix}-br${i}`} />)
    if (p) out.push(<Fragment key={`${keyPrefix}-t${i}`}>{p}</Fragment>)
  })
  return out
}

/** Парсит абзац целиком: ищет [[...]] маркеры (могут содержать \n) и собирает реакт-ноды. */
function parseParagraph(para: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  ACCENT_RE.lastIndex = 0
  while ((m = ACCENT_RE.exec(para)) !== null) {
    if (m.index > last) {
      out.push(...textWithBreaks(para.slice(last, m.index), `${keyPrefix}-pre${i}`))
    }
    out.push(
      <span key={`${keyPrefix}-a${i}`} className="accent">
        {textWithBreaks(m[1], `${keyPrefix}-a${i}-in`)}
      </span>
    )
    last = m.index + m[0].length
    i++
  }
  if (last < para.length) {
    out.push(...textWithBreaks(para.slice(last), `${keyPrefix}-end`))
  }
  return out
}

function splitParagraphs(text: string): string[] {
  const normalized = (text || '').replace(/\r\n/g, '\n')
  return normalized.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
}

export function RichText({ text, paragraphClassName, paragraphReveal }: Props) {
  if (!text) return null
  const paragraphs = splitParagraphs(text)
  const className = paragraphReveal
    ? `${paragraphClassName ?? ''} reveal`.trim()
    : paragraphClassName
  return (
    <>
      {paragraphs.map((para, pi) => (
        <p
          key={pi}
          className={className}
          style={paragraphReveal ? ({ ['--i' as string]: pi } as CSSProperties) : undefined}
        >
          {parseParagraph(para, String(pi))}
        </p>
      ))}
    </>
  )
}

/** Чистый счётчик длины — без `[[ ]]` маркеров. */
export function plainLength(text: string): number {
  if (!text) return 0
  return text.replace(/\[\[|\]\]/g, '').replace(/\r\n/g, '\n').length
}
