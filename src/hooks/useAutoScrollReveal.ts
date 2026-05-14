import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Observes every `.reveal` element on the page and adds `is-visible`
 * when it enters the viewport. Re-scans on route changes so new pages pick up.
 */
export function useAutoScrollReveal() {
  const location = useLocation()

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )

    const scan = () => {
      document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => observer.observe(el))
    }

    // Initial scan after layout settles
    const raf = requestAnimationFrame(scan)

    // Watch for DOM mutations (e.g. async data loads adding new elements)
    const mutationObserver = new MutationObserver(() => scan())
    mutationObserver.observe(document.body, { childList: true, subtree: true })

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      mutationObserver.disconnect()
    }
  }, [location.pathname])
}
