import { useEffect, useMemo, useState } from 'react'
import { api, removeToken, type ContentSlot } from './api'
import './App.css'

type NavPage = 'products' | 'categories' | 'orders' | 'stats' | 'content'

export default function ContentPage({ onNavigate, newCount }: {
  onNavigate?: (page: NavPage) => void
  newCount?: number
}) {
  const [slots, setSlots] = useState<ContentSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activePage, setActivePage] = useState<string>('home')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getContent()
      setSlots(data.slots || [])
    } catch (e: any) {
      setError(e?.message || 'Ошибка загрузки контента')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const pages = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of slots) if (!map.has(s.page)) map.set(s.page, s.pageTitle)
    return Array.from(map.entries()).map(([key, title]) => ({ key, title }))
  }, [slots])

  const visibleSlots = useMemo(
    () => slots.filter((s) => s.page === activePage).sort((a, b) => a.order - b.order),
    [slots, activePage]
  )

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleLogout = () => {
    removeToken()
    window.location.reload()
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Админ-панель - BUSINITTI</h1>
        <div className="header-nav">
          <button className="nav-btn" onClick={() => onNavigate?.('products')}>Товары</button>
          <button className="nav-btn" onClick={() => onNavigate?.('categories')}>Категории</button>
          <button className="nav-btn" onClick={() => onNavigate?.('orders')}>
            Заказы
            {!!newCount && newCount > 0 && (
              <span className="nav-badge" style={{ marginLeft: 6 }}>{newCount}</span>
            )}
          </button>
          <button className="nav-btn" onClick={() => onNavigate?.('stats')}>Статистика</button>
          <button className="nav-btn active" onClick={() => onNavigate?.('content')}>Контент</button>
        </div>
        <div className="header-actions">
          <button onClick={handleLogout} className="logout-btn">Выйти</button>
        </div>
      </header>

      <div className="admin-content">
        <div className="content-pages-tabs">
          {pages.map((p) => (
            <button
              key={p.key}
              className={`content-page-tab ${activePage === p.key ? 'active' : ''}`}
              onClick={() => setActivePage(p.key)}
            >
              {p.title}
            </button>
          ))}
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading">Загрузка...</div>
        ) : visibleSlots.length === 0 ? (
          <div className="empty-state">На этой странице пока нечего редактировать</div>
        ) : (
          <div className="content-slots-list">
            {visibleSlots.map((slot) => (
              <ContentSlotCard key={slot.key} slot={slot} onSaved={load} showToast={showToast} />
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}
    </div>
  )
}

function ContentSlotCard({
  slot, onSaved, showToast,
}: {
  slot: ContentSlot
  onSaved: () => void
  showToast: (m: string, t: 'success' | 'error') => void
}) {
  const [textValue, setTextValue] = useState(slot.value)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => { setTextValue(slot.value) }, [slot.value, slot.key])

  const currentSrc = slot.value || slot.defaultValue || ''

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const url = await api.uploadImage(file)
      await api.updateContentSlot(slot.key, url)
      showToast('Фото обновлено', 'success')
      onSaved()
    } catch (e: any) {
      showToast(e?.message || 'Ошибка загрузки', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleSaveText = async () => {
    if (!textValue.trim()) {
      showToast('Введите значение', 'error')
      return
    }
    setSaving(true)
    try {
      await api.updateContentSlot(slot.key, textValue.trim())
      showToast('Сохранено', 'success')
      onSaved()
    } catch (e: any) {
      showToast(e?.message || 'Ошибка сохранения', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Сбросить к оригиналу?')) return
    setResetting(true)
    try {
      await api.resetContentSlot(slot.key)
      showToast('Сброшено к оригиналу', 'success')
      onSaved()
    } catch (e: any) {
      showToast(e?.message || 'Ошибка сброса', 'error')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="content-slot-card">
      <div className="content-slot-header">
        <div className="content-slot-titles">
          <div className="content-slot-label">{slot.label}</div>
          {slot.description && (
            <div className="content-slot-desc">{slot.description}</div>
          )}
        </div>
        {slot.isOverridden && (
          <span className="content-slot-badge">изменено</span>
        )}
      </div>

      {slot.type === 'image' && (
        <div className="content-slot-image-area">
          <div className="content-slot-image-preview">
            {currentSrc ? (
              <img src={currentSrc} alt={slot.label} />
            ) : (
              <div className="no-image">Нет фото</div>
            )}
          </div>
          <div className="content-slot-actions">
            {slot.hint && (
              <div className="content-slot-hint">{slot.hint}</div>
            )}
            <label className="btn-upload-content">
              {uploading ? 'Загрузка...' : 'Загрузить новое фото'}
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleUpload(f)
                  e.target.value = ''
                }}
                style={{ display: 'none' }}
              />
            </label>
            {slot.isOverridden && (
              <button
                className="btn-secondary"
                disabled={resetting}
                onClick={handleReset}
              >
                {resetting ? 'Сброс...' : 'Сбросить к оригиналу'}
              </button>
            )}
          </div>
        </div>
      )}

      {(slot.type === 'text' || slot.type === 'link') && (
        <div className="content-slot-text-area">
          {slot.type === 'text' ? (
            <textarea
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder={slot.defaultValue || 'Введите текст'}
              rows={4}
              className="content-slot-textarea"
            />
          ) : (
            <input
              type="url"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder={slot.defaultValue || 'https://...'}
              className="content-slot-input"
            />
          )}
          <div className="content-slot-actions">
            <button
              className="btn-order-ship"
              disabled={saving || !textValue.trim() || textValue.trim() === slot.value}
              onClick={handleSaveText}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            {slot.isOverridden && (
              <button
                className="btn-secondary"
                disabled={resetting}
                onClick={handleReset}
              >
                {resetting ? 'Сброс...' : 'Сбросить'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
