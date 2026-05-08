import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Product } from '../api/products'

export type CartItem = {
  slug: string
  title: string
  price_rub: number
  image?: string
  quantity: number
}

type CartContextValue = {
  items: CartItem[]
  totalCount: number
  totalPrice: number
  addItem: (product: Product, quantity?: number) => void
  removeItem: (slug: string) => void
  setQuantity: (slug: string, quantity: number) => void
  clear: () => void

  itemModalProduct: Product | null
  openItem: (product: Product) => void
  closeItem: () => void

  isCartOpen: boolean
  openCart: () => void
  closeCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

const STORAGE_KEY = 'businitti.cart.v1'

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data.filter((it) => it && typeof it.slug === 'string' && typeof it.quantity === 'number')
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadCart())
  const [itemModalProduct, setItemModalProduct] = useState<Product | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // ignore quota / private mode failures
    }
  }, [items])

  const addItem = useCallback((product: Product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((it) => it.slug === product.slug)
      const price = product.discount_price_rub ?? product.price_rub
      if (existing) {
        return prev.map((it) =>
          it.slug === product.slug ? { ...it, quantity: it.quantity + quantity } : it,
        )
      }
      return [
        ...prev,
        {
          slug: product.slug,
          title: product.title,
          price_rub: price,
          image: product.images[0],
          quantity,
        },
      ]
    })
  }, [])

  const removeItem = useCallback((slug: string) => {
    setItems((prev) => prev.filter((it) => it.slug !== slug))
  }, [])

  const setQuantity = useCallback((slug: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((it) => it.slug !== slug)
        : prev.map((it) => (it.slug === slug ? { ...it, quantity } : it)),
    )
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const openItem = useCallback((product: Product) => setItemModalProduct(product), [])
  const closeItem = useCallback(() => setItemModalProduct(null), [])
  const openCart = useCallback(() => setIsCartOpen(true), [])
  const closeCart = useCallback(() => setIsCartOpen(false), [])

  const totalCount = useMemo(() => items.reduce((s, it) => s + it.quantity, 0), [items])
  const totalPrice = useMemo(() => items.reduce((s, it) => s + it.price_rub * it.quantity, 0), [items])

  const value: CartContextValue = {
    items, totalCount, totalPrice,
    addItem, removeItem, setQuantity, clear,
    itemModalProduct, openItem, closeItem,
    isCartOpen, openCart, closeCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
