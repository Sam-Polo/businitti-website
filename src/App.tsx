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
import PaymentResultPage from './pages/PaymentResultPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<MainPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/delivery" element={<DeliveryPage />} />
          <Route path="/guarantee" element={<GuaranteePage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/payment/success" element={<PaymentResultPage variant="success" />} />
          <Route path="/payment/fail" element={<PaymentResultPage variant="fail" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
