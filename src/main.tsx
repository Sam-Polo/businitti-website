import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App'
import { SiteContentProvider } from './contexts/SiteContentContext'
import { CategoriesProvider } from './contexts/CategoriesContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SiteContentProvider>
      <CategoriesProvider>
        <App />
      </CategoriesProvider>
    </SiteContentProvider>
  </StrictMode>,
)
