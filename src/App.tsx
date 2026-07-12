import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import MainPage from './pages/MainPage'
import AboutPage from './pages/AboutPage'
import DeliveryPage from './pages/DeliveryPage'
import GuaranteePage from './pages/GuaranteePage'
import RecommendationsPage from './pages/RecommendationsPage'
import ContactsPage from './pages/ContactsPage'
import CatalogPage from './pages/CatalogPage'
import CategoryPage from './pages/CategoryPage'
import ProductModalRoute from './components/ProductModalRoute'
import PaymentResultPage from './pages/PaymentResultPage'
import NotFoundPage from './pages/NotFoundPage'
import { usePageTracking } from './hooks/usePageTracking'

// отправляет просмотры страниц в аналитику при смене роута (см. usePageTracking)
function RouteTracker() {
  usePageTracking()
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteTracker />
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<MainPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/delivery" element={<DeliveryPage />} />
          <Route path="/guarantee" element={<GuaranteePage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          {/* Товар — вложенный роут: категория остаётся под модалкой, не перемонтируется */}
          <Route path="/category/:slug" element={<CategoryPage />}>
            <Route path=":productSlug" element={<ProductModalRoute />} />
          </Route>
          <Route path="/payment/success" element={<PaymentResultPage variant="success" />} />
          <Route path="/payment/fail" element={<PaymentResultPage variant="fail" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
