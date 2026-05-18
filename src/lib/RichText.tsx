import { Fragment, type ReactNode } from 'react'

/**
 * Лёгкая разметка для текстов, редактируемых через админку.
 *
 *   - Пустая строка (двойной перенос) = новый абзац `<p>`.
 *   - Одиночный перенос строки = `<br />` внутри текущего абзаца.
 *   - `[[текст]]` = `<span class="accent">текст</span>` (розовый акцент).
 *
 * Компонент не оборачивает абзацы в собственный контейнер — родитель решает.
 * Это нужно для случаев, где родитель — flex-контейнер с justify-content:space-between
 * (например, .guarantee-return).
 *
 * Никакого HTML в строке не допускается — всё, что прилетает из админки,
 * рендерится как plain text за исключением `[[...]]` маркеров (React эскейпит
 * `<`, `>`, `&` автоматически).
 */

type Props = {
  text: string
  /** className, применяемый к каждому абзацу `<p>` */
  paragraphClassName?: string
}

const ACCENT_RE = /\[\[([\s\S]+?)\]\]/g

function parseInline(line: string, lineKey: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  let i = 0
  ACCENT_RE.lastIndex = 0
  while ((match = ACCENT_RE.exec(line)) !== null) {
    if (match.index > last) {
      nodes.push(line.slice(last, match.index))
    }
    nodes.push(<span key={`${lineKey}-a${i}`} className="accent">{match[1]}</span>)
    last = match.index + match[0].length
    i++
  }
  if (last < line.length) nodes.push(line.slice(last))
  return nodes
}

function splitParagraphs(text: string): string[] {
  const normalized = (text || '').replace(/\r\n/g, '\n')
  return normalized.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
}

function renderParagraph(para: string, key: string | number, className?: string): ReactNode {
  const lines = para.split('\n')
  return (
    <p key={key} className={className}>
      {lines.map((line, li) => (
        <Fragment key={li}>
          {parseInline(line, `${key}-${li}`)}
          {li < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </p>
  )
}

export function RichText({ text, paragraphClassName }: Props) {
  if (!text) return null
  const paragraphs = splitParagraphs(text)
  return <>{paragraphs.map((p, i) => renderParagraph(p, i, paragraphClassName))}</>
}

/** Чистый счётчик длины — без `[[ ]]` маркеров. */
export function plainLength(text: string): number {
  if (!text) return 0
  return text.replace(/\[\[|\]\]/g, '').replace(/\r\n/g, '\n').length
}
