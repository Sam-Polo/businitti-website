import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ItemCardModal from '../components/ItemCardModal'
import CartModal from '../components/CartModal'
import { CartProvider } from '../contexts/CartContext'
import { useAutoScrollReveal } from '../hooks/useAutoScrollReveal'

export default function MainLayout() {
  const location = useLocation()
  useAutoScrollReveal()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <CartProvider>
      <Header />
      <div key={location.pathname} className="page-fade">
        <Outlet />
      </div>
      <Footer />
      <ItemCardModal />
      <CartModal />
    </CartProvider>
  )
}
