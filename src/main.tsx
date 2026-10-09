import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App'
import { SiteContentProvider } from './contexts/SiteContentContext'
import { CategoriesProvider } from './contexts/CategoriesContext'
import { loadAnalytics } from './lib/analytics'
import { readCookieConsent } from './lib/cookieConsent'

// Счётчики — только если посетитель уже согласился на cookie; иначе их подключит баннер по «Принять»
if (readCookieConsent() === 'accepted') loadAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SiteContentProvider>
      <CategoriesProvider>
        <App />
      </CategoriesProvider>
    </SiteContentProvider>
  </StrictMode>,
)
