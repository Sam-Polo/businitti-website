import { useEffect } from 'react'
import { Outlet, useLocation, useMatch } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ItemCardModal from '../components/ItemCardModal'
import CartModal from '../components/CartModal'
import { CartProvider } from '../contexts/CartContext'
import { useAutoScrollReveal } from '../hooks/useAutoScrollReveal'
import { PRODUCT_ROUTE_PATTERN } from '../hooks/useProductRoute'

export default function MainLayout() {
  const location = useLocation()
  const productMatch = useMatch(PRODUCT_ROUTE_PATTERN)
  useAutoScrollReveal()

  // Пока поверх категории открыт товар, «страницей» считаем категорию: иначе
  // добавление /:productSlug сменило бы key и перемонтировало страницу (сброс скролла).
  const pageKey = productMatch ? `/category/${productMatch.params.slug}` : location.pathname

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pageKey])

  return (
    <CartProvider>
      <Header />
      <div key={pageKey} className="page-fade">
        <Outlet />
      </div>
      <Footer />
      <ItemCardModal />
      <CartModal />
    </CartProvider>
  )
}
