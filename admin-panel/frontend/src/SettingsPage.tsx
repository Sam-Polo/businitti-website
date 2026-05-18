import { useEffect, useState } from 'react'
import { api, removeToken } from './api'
import './App.css'

type NavPage = 'products' | 'categories' | 'orders' | 'stats' | 'content' | 'links' | 'settings'

export default function SettingsPage({ onNavigate, newCount }: {
  onNavigate?: (page: NavPage) => void
  newCount?: number
}) {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

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
          <button className="nav-btn" onClick={() => onNavigate?.('links')}>Ссылки</button>
          <button className="nav-btn active" onClick={() => onNavigate?.('settings')}>Настройки</button>
        </div>
        <div className="header-actions">
          <button onClick={handleLogout} className="logout-btn">Выйти</button>
        </div>
      </header>

      <div className="admin-content">
        <div className="content-slots-list">
          <DeliveryPricesCard showToast={showToast} />
          <OrdersStatusCard showToast={showToast} />
          <PasswordCard showToast={showToast} />
        </div>
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}
    </div>
  )
}

function DeliveryPricesCard({ showToast }: { showToast: (m: string, t: 'success' | 'error') => void }) {
  const [cdek, setCdek] = useState<string>('')
  const [ym, setYm] = useState<string>('')
  const [defaults, setDefaults] = useState<{ cdek: number; yandex_market: number } | null>(null)
  const [isOverridden, setIsOverridden] = useState<{ cdek: boolean; yandex_market: boolean }>({ cdek: false, yandex_market: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.getDeliveryPrices()
      setCdek(String(data.cdek))
      setYm(String(data.yandex_market))
      setDefaults(data.defaults)
      setIsOverridden(data.isOverridden)
    } catch (e: any) {
      showToast(e?.message || 'Ошибка загрузки цен', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    const cdekNum = Number(cdek)
    const ymNum = Number(ym)
    if (!Number.isFinite(cdekNum) || cdekNum <= 0 || !Number.isFinite(ymNum) || ymNum <= 0) {
      showToast('Цены должны быть положительными числами', 'error')
      return
    }
    setSaving(true)
    try {
      await api.updateDeliveryPrices(cdekNum, ymNum)
      showToast('Цены доставки обновлены', 'success')
      load()
    } catch (e: any) {
      showToast(e?.message || 'Ошибка сохранения', 'error')
    } finally {
      setSaving(false)
    }
  }

  const isOverridden_any = isOverridden.cdek || isOverridden.yandex_market

  return (
    <div className="content-slot-card">
      <div className="content-slot-header">
        <div className="content-slot-titles">
          <div className="content-slot-label">Цены доставки</div>
          <div className="content-slot-desc">Используются на странице «Доставка» и при оформлении заказа</div>
        </div>
        {isOverridden_any ? (
          <span className="content-slot-badge">изменено</span>
        ) : (
          <span className="content-slot-badge content-slot-badge-original">оригинал</span>
        )}
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : (
        <>
          <div className="paired-cta-fields">
            <label className="paired-cta-field">
              <span className="paired-cta-field-label">СДЭК, ₽</span>
              <input
                type="number"
                min="0"
                value={cdek}
                onChange={(e) => setCdek(e.target.value)}
                className="content-slot-input"
              />
              {defaults && <span className="settings-hint">по умолчанию: {defaults.cdek} ₽</span>}
            </label>
            <label className="paired-cta-field">
              <span className="paired-cta-field-label">Яндекс Маркет, ₽</span>
              <input
                type="number"
                min="0"
                value={ym}
                onChange={(e) => setYm(e.target.value)}
                className="content-slot-input"
              />
              {defaults && <span className="settings-hint">по умолчанию: {defaults.yandex_market} ₽</span>}
            </label>
          </div>
          <div className="content-slot-actions" style={{ flexDirection: 'row' }}>
            <button
              className="btn-order-ship"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function OrdersStatusCard({ showToast }: { showToast: (m: string, t: 'success' | 'error') => void }) {
  const [closed, setClosed] = useState(false)
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.getOrdersSettings()
      setClosed(!!data.ordersClosed)
      setDate(data.closeDate || '')
    } catch (e: any) {
      showToast(e?.message || 'Ошибка загрузки', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (closed && !date) {
      showToast('Укажите дату открытия', 'error')
      return
    }
    setSaving(true)
    try {
      await api.updateOrdersSettings({ ordersClosed: closed, closeDate: date || undefined })
      showToast(closed ? 'Заказы закрыты' : 'Заказы открыты', 'success')
      load()
    } catch (e: any) {
      showToast(e?.message || 'Ошибка сохранения', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="content-slot-card">
      <div className="content-slot-header">
        <div className="content-slot-titles">
          <div className="content-slot-label">Приём заказов</div>
          <div className="content-slot-desc">
            Когда заказы закрыты, в корзине вместо «Оформить» показывается сообщение с датой открытия.
            Товары в корзину добавлять можно.
          </div>
        </div>
        {closed ? (
          <span className="content-slot-badge">закрыто</span>
        ) : (
          <span className="content-slot-badge content-slot-badge-original">открыто</span>
        )}
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : (
        <>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={closed}
              onChange={(e) => setClosed(e.target.checked)}
            />
            <span>Закрыть приём заказов</span>
          </label>
          {closed && (
            <label className="paired-cta-field" style={{ marginTop: 12 }}>
              <span className="paired-cta-field-label">Дата открытия</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="content-slot-input"
                style={{ maxWidth: 240 }}
              />
            </label>
          )}
          <div className="content-slot-actions" style={{ flexDirection: 'row', marginTop: 12 }}>
            <button className="btn-order-ship" disabled={saving} onClick={handleSave}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function PasswordCard({ showToast }: { showToast: (m: string, t: 'success' | 'error') => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!currentPassword) {
      showToast('Введите текущий пароль', 'error')
      return
    }
    if (newPassword.length < 6) {
      showToast('Новый пароль должен быть не короче 6 символов', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast('Пароли не совпадают', 'error')
      return
    }
    setSaving(true)
    try {
      await api.changePassword(currentPassword, newPassword, newUsername.trim() || undefined)
      showToast('Пароль обновлён. Войдите снова.', 'success')
      setCurrentPassword('')
      setNewUsername('')
      setNewPassword('')
      setConfirmPassword('')
      // выходим, чтобы пользователь залогинился с новым паролем
      setTimeout(() => {
        removeToken()
        window.location.reload()
      }, 1500)
    } catch (e: any) {
      showToast(e?.message || 'Ошибка', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="content-slot-card">
      <div className="content-slot-header">
        <div className="content-slot-titles">
          <div className="content-slot-label">Смена пароля</div>
          <div className="content-slot-desc">
            Логин по умолчанию <code>admin</code>, пароль <code>admin</code>. После смены потребуется войти заново.
          </div>
        </div>
      </div>

      <div className="paired-cta-fields password-grid">
        <label className="paired-cta-field">
          <span className="paired-cta-field-label">Текущий пароль</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="content-slot-input"
            autoComplete="current-password"
          />
        </label>
        <label className="paired-cta-field">
          <span className="paired-cta-field-label">Новый логин (необязательно)</span>
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="content-slot-input"
            placeholder="оставить как есть"
            autoComplete="username"
          />
        </label>
        <label className="paired-cta-field">
          <span className="paired-cta-field-label">Новый пароль</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="content-slot-input"
            autoComplete="new-password"
          />
        </label>
        <label className="paired-cta-field">
          <span className="paired-cta-field-label">Повтор нового пароля</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="content-slot-input"
            autoComplete="new-password"
          />
        </label>
      </div>

      <div className="content-slot-actions" style={{ flexDirection: 'row' }}>
        <button className="btn-order-ship" disabled={saving} onClick={handleSave}>
          {saving ? 'Сохранение...' : 'Сменить'}
        </button>
      </div>
    </div>
  )
}
