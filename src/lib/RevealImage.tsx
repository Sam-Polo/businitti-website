import { useEffect, useRef, useState, type CSSProperties } from 'react'
import './RevealImage.css'

type Props = {
  src: string
  alt?: string
  /** Extra classes for the wrapper — sizing, border-radius, `reveal`, etc. */
  className?: string
  /** object-position for the <img> (replaces background-position). */
  objectPosition?: string
  /** Inline styles applied to the wrapper. */
  style?: CSSProperties
}

/**
 * Image that fades in smoothly once the file has actually downloaded.
 * The wrapper keeps layout/sizing classes (and optional `reveal` for scroll-in);
 * the inner <img> handles its own load-fade so admin-uploaded photos never pop in abruptly.
 */
export function RevealImage({ src, alt = '', className, objectPosition, style }: Props) {
  const [loaded, setLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = imgRef.current
    // Image may already be in browser cache — onLoad won't fire then.
    if (img && img.complete && img.naturalWidth > 0) {
      setLoaded(true)
    } else {
      setLoaded(false)
    }
  }, [src])

  return (
    <div className={`reveal-image${className ? ' ' + className : ''}`} style={style}>
      <img
        ref={imgRef}
        className={`reveal-image__img${loaded ? ' is-loaded' : ''}`}
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        style={objectPosition ? { objectPosition } : undefined}
      />
    </div>
  )
}
