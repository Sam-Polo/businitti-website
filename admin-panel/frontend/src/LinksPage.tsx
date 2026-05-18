import { useEffect, useMemo, useState } from 'react'
import { api, removeToken, type ContentSlot } from './api'
import './App.css'

type NavPage = 'products' | 'categories' | 'orders' | 'stats' | 'content' | 'links' | 'settings'

export default function LinksPage({ onNavigate, newCount }: {
  onNavigate?: (page: NavPage) => void
  newCount?: number
}) {
  const [slots, setSlots] = useState<ContentSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getContent()
      setSlots((data.slots || []).filter((s) => s.page === 'links').sort((a, b) => a.order - b.order))
    } catch (e: any) {
      setError(e?.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

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
          <button className="nav-btn" onClick={() => onNavigate?.('content')}>Контент</button>
          <button className="nav-btn active" onClick={() => onNavigate?.('links')}>Ссылки</button>
          <button className="nav-btn" onClick={() => onNavigate?.('settings')}>Настройки</button>
        </div>
        <div className="header-actions">
          <button onClick={handleLogout} className="logout-btn">Выйти</button>
        </div>
      </header>

      <div className="admin-content">
        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading">Загрузка...</div>
        ) : slots.length === 0 ? (
          <div className="empty-state">Нет ссылок</div>
        ) : (
          <div className="content-slots-list">
            {(() => {
              const rendered = new Set<string>()
              const nodes: JSX.Element[] = []
              for (const slot of slots) {
                if (rendered.has(slot.key)) continue
                if (slot.key === 'links.cta_contacts_url') {
                  const labelSlot = slots.find((s) => s.key === 'links.cta_contacts_label')
                  if (labelSlot) {
                    rendered.add(labelSlot.key)
                    nodes.push(
                      <PairedCtaCard
                        key={slot.key}
                        urlSlot={slot}
                        labelSlot={labelSlot}
                        onSaved={load}
                        showToast={showToast}
                      />
                    )
                    continue
                  }
                }
                nodes.push(<LinkSlotRow key={slot.key} slot={slot} onSaved={load} showToast={showToast} />)
              }
              return nodes
            })()}
          </div>
        )}
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}
    </div>
  )
}

/** Парная карточка: ссылка для кнопки «Контакты» + надпись кнопки рядом. */
function PairedCtaCard({
  urlSlot, labelSlot, onSaved, showToast,
}: {
  urlSlot: ContentSlot
  labelSlot: ContentSlot
  onSaved: () => void
  showToast: (m: string, t: 'success' | 'error') => void
}) {
  const urlBaseline = urlSlot.isOverridden ? urlSlot.value : (urlSlot.defaultValue || '')
  const labelBaseline = labelSlot.isOverridden ? labelSlot.value : (labelSlot.defaultValue || '')
  const [url, setUrl] = useState(urlBaseline)
  const [label, setLabel] = useState(labelBaseline)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => { setUrl(urlBaseline) }, [urlBaseline, urlSlot.key])
  useEffect(() => { setLabel(labelBaseline) }, [labelBaseline, labelSlot.key])

  const urlChanged = url !== urlBaseline
  const labelChanged = label !== labelBaseline
  const hasChanges = urlChanged || labelChanged
  const isOverridden = urlSlot.isOverridden || labelSlot.isOverridden

  const handleSave = async () => {
    if (!url.trim() || !label.trim()) {
      showToast('Заполните оба поля', 'error')
      return
    }
    setSaving(true)
    try {
      const calls: Promise<unknown>[] = []
      if (urlChanged) calls.push(api.updateContentSlot(urlSlot.key, url.trim()))
      if (labelChanged) calls.push(api.updateContentSlot(labelSlot.key, label.trim()))
      await Promise.all(calls)
      showToast('Сохранено', 'success')
      onSaved()
    } catch (e: any) {
      showToast(e?.message || 'Ошибка сохранения', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Сбросить кнопку «Контакты» к оригиналу?')) return
    setResetting(true)
    try {
      const calls: Promise<unknown>[] = []
      if (urlSlot.isOverridden) calls.push(api.resetContentSlot(urlSlot.key))
      if (labelSlot.isOverridden) calls.push(api.resetContentSlot(labelSlot.key))
      await Promise.all(calls)
      showToast('Сброшено к оригиналу', 'success')
      onSaved()
    } catch (e: any) {
      showToast(e?.message || 'Ошибка сброса', 'error')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="content-slot-card link-slot">
      <div className="content-slot-header">
        <div className="content-slot-titles">
          <div className="content-slot-label">Кнопка в блоке «Контакты»</div>
          <div className="content-slot-desc">Используется на главной, странице категории и странице «Контакты»</div>
        </div>
        {isOverridden ? (
          <span className="content-slot-badge">изменено</span>
        ) : (
          <span className="content-slot-badge content-slot-badge-original">оригинал</span>
        )}
      </div>

      <div className="paired-cta-fields">
        <label className="paired-cta-field">
          <span className="paired-cta-field-label">Ссылка</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={urlSlot.defaultValue}
            className="content-slot-input"
          />
        </label>
        <label className="paired-cta-field">
          <span className="paired-cta-field-label">Надпись на кнопке</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={labelSlot.defaultValue}
            className="content-slot-input"
          />
        </label>
      </div>

      <div className="content-slot-actions" style={{ flexDirection: 'row' }}>
        <button
          className="btn-order-ship"
          disabled={saving || !hasChanges || !url.trim() || !label.trim()}
          onClick={handleSave}
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
        {isOverridden && (
          <button className="btn-secondary" disabled={resetting} onClick={handleReset}>
            {resetting ? 'Сброс...' : 'Сбросить'}
          </button>
        )}
      </div>
    </div>
  )
}

function LinkSlotRow({
  slot, onSaved, showToast,
}: {
  slot: ContentSlot
  onSaved: () => void
  showToast: (m: string, t: 'success' | 'error') => void
}) {
  const baseline = slot.isOverridden ? slot.value : (slot.defaultValue || '')
  const [value, setValue] = useState(baseline)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => { setValue(baseline) }, [baseline, slot.key])

  const isUnchanged = value === baseline
  const inputType = useMemo(() => (slot.type === 'link' ? 'url' : 'text'), [slot.type])

  const handleSave = async () => {
    if (!value.trim()) {
      showToast('Введите значение', 'error')
      return
    }
    setSaving(true)
    try {
      await api.updateContentSlot(slot.key, value.trim())
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
    <div className="content-slot-card link-slot">
      <div className="content-slot-header">
        <div className="content-slot-titles">
          <div className="content-slot-label">{slot.label}</div>
          {slot.description && (
            <div className="content-slot-desc">{slot.description}</div>
          )}
        </div>
        {slot.isOverridden ? (
          <span className="content-slot-badge">изменено</span>
        ) : (
          <span className="content-slot-badge content-slot-badge-original">оригинал</span>
        )}
      </div>

      <div className="link-slot-row">
        <input
          type={inputType}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={slot.defaultValue}
          className="content-slot-input"
        />
        <div className="content-slot-actions">
          <button
            className="btn-order-ship"
            disabled={saving || !value.trim() || isUnchanged}
            onClick={handleSave}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          {slot.isOverridden && (
            <button className="btn-secondary" disabled={resetting} onClick={handleReset}>
              {resetting ? 'Сброс...' : 'Сбросить'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
