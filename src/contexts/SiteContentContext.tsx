import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || 'https://admin.businitti.ru'

type SiteContentMap = Record<string, string>

type SiteContentContextValue = {
  content: SiteContentMap
  loaded: boolean
}

const SiteContentContext = createContext<SiteContentContextValue>({
  content: {},
  loaded: false,
})

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContentMap>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/api/public/content`)
      .then((r) => r.ok ? r.json() : { content: {} })
      .then((data) => {
        if (!cancelled) {
          setContent(data?.content || {})
          setLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => { cancelled = true }
  }, [])

  return (
    <SiteContentContext.Provider value={{ content, loaded }}>
      {children}
    </SiteContentContext.Provider>
  )
}

/**
 * Возвращает строковое значение редактируемого слота. Если в админке не задано
 * (или ещё не загрузилось) — возвращает fallback.
 */
export function useSiteContent(key: string, fallback: string = ''): string {
  const { content } = useContext(SiteContentContext)
  return content[key] || fallback
}

/** Доступ к сырой мапе override'ов — для случаев, когда нужно много ключей сразу. */
export function useSiteContentMap() {
  return useContext(SiteContentContext).content
}
