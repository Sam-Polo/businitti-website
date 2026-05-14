import { useEffect, useState } from 'react'

const CLOSE_DURATION = 250

/**
 * Defers unmounting so an exit animation can play.
 * - `shouldRender`: keep the JSX in the tree
 * - `isClosing`: apply close-animation class
 */
export function useModalAnimation(isOpen: boolean) {
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      setIsClosing(false)
      return
    }
    if (!shouldRender) return
    setIsClosing(true)
    const t = window.setTimeout(() => {
      setShouldRender(false)
      setIsClosing(false)
    }, CLOSE_DURATION)
    return () => window.clearTimeout(t)
  }, [isOpen, shouldRender])

  return { shouldRender, isClosing }
}
