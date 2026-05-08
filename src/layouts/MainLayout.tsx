import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ItemCardModal from '../components/ItemCardModal'
import CartModal from '../components/CartModal'
import { CartProvider } from '../contexts/CartContext'

export default function MainLayout() {
  return (
    <CartProvider>
      <Header />
      <Outlet />
      <Footer />
      <ItemCardModal />
      <CartModal />
    </CartProvider>
  )
}
