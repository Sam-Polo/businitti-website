import { useEffect, useRef, type TouchEvent } from 'react'
import './Lightbox.css'

type Props = {
  images: string[]
  index: number
  onChange: (index: number) => void
  onClose: () => void
}

const SWIPE_THRESHOLD = 50

export function Lightbox({ images, index, onChange, onClose }: Props) {
  const touchStartX = useRef<number | null>(null)
  const indexRef = useRef(index)
  indexRef.current = index

  const next = () => {
    if (indexRef.current < images.length - 1) onChange(indexRef.current + 1)
  }
  const prev = () => {
    if (indexRef.current > 0) onChange(indexRef.current - 1)
  }

  // Body scroll lock is handled by the parent modal — Lightbox doesn't touch
  // document.body to avoid racing with the modal's effect cleanup.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      } else if (e.key === 'ArrowLeft') {
        prev()
      } else if (e.key === 'ArrowRight') {
        next()
      }
    }
    // Capture phase so this fires before any modal-level Escape handlers
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose])

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      if (delta > 0) prev()
      else next()
    }
    touchStartX.current = null
  }

  const hasMultiple = images.length > 1

  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-label="Просмотр фото">
      <button className="lightbox__close" onClick={onClose} aria-label="Закрыть">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4L20 20M20 4L4 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <div
        className="lightbox__stage"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {images.map((img, i) => (
          <img
            key={i}
            src={img}
            alt=""
            className={`lightbox__img${i === index ? ' is-active' : ''}`}
            draggable={false}
          />
        ))}
      </div>

      {hasMultiple && (
        <>
          <button
            className="lightbox__nav lightbox__nav--prev"
            onClick={(e) => { e.stopPropagation(); prev() }}
            disabled={index === 0}
            aria-label="Предыдущее фото"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            className="lightbox__nav lightbox__nav--next"
            onClick={(e) => { e.stopPropagation(); next() }}
            disabled={index === images.length - 1}
            aria-label="Следующее фото"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="lightbox__bars" onClick={(e) => e.stopPropagation()}>
            {images.map((_, i) => (
              <button
                key={i}
                className={`lightbox__bar${i === index ? ' is-active' : ''}`}
                onClick={() => onChange(i)}
                aria-label={`Фото ${i + 1}`}
                aria-current={i === index}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
