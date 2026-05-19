import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchPublicCategories, type PublicCategory } from '../api/categories'

type CategoriesContextValue = {
  categories: PublicCategory[]
  loaded: boolean
}

const CategoriesContext = createContext<CategoriesContextValue>({ categories: [], loaded: false })

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<PublicCategory[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchPublicCategories()
      .then((list) => { if (!cancelled) { setCategories(list); setLoaded(true) } })
      .catch(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [])

  return (
    <CategoriesContext.Provider value={{ categories, loaded }}>
      {children}
    </CategoriesContext.Provider>
  )
}

export function useCategories(): CategoriesContextValue {
  return useContext(CategoriesContext)
}
