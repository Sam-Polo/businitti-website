import maxGlyph from '../assets/max-glyph.png'
import './MaxIcon.css'

type Props = {
  size?: number
  className?: string
}

/**
 * MAX messenger icon — pink circle (CSS) + white glyph (PNG).
 * Built without an SVG-with-embedded-raster wrapper, which iOS Safari
 * renders unreliably (pixelation / black square).
 */
export function MaxIcon({ size = 25, className }: Props) {
  return (
    <span
      className={`max-icon${className ? ' ' + className : ''}`}
      style={{ width: size, height: size }}
    >
      <img src={maxGlyph} alt="" className="max-icon__glyph" />
    </span>
  )
}
