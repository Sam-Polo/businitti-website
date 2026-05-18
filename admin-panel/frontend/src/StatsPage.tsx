import { useEffect, useState } from 'react'
import { api, removeToken, type OrderStats } from './api'
import './App.css'

type NavPage = 'products' | 'categories' | 'orders' | 'stats' | 'content' | 'links' | 'settings'
type Period = 'day' | 'week' | 'month' | 'all'

const PERIOD_LABELS: Record<Period, string> = {
  day: 'Сегодня',
  week: 'Неделя',
  month: 'Месяц',
  all: 'Всё время',
}

const STATUS_LABELS = {
  pending_payment: 'Ожидают оплаты',
  new: 'Новые',
  shipped: 'Отправленные',
  cancelled: 'Отменённые',
  refunded: 'Возвраты',
}

function formatPrice(rub: number): string {
  return `${(rub || 0).toLocaleString('ru-RU')} ₽`
}

export default function StatsPage({ onNavigate, newCount }: {
  onNavigate?: (page: NavPage) => void
  newCount?: number
}) {
  const [period, setPeriod] = useState<Period>('all')
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api.getOrdersStats(period)
      .then((data) => setStats(data))
      .catch((e) => setError(e?.message || 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [period])

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
          <button className="nav-btn active" onClick={() => onNavigate?.('stats')}>Статистика</button>
          <button className="nav-btn" onClick={() => onNavigate?.('content')}>Контент</button>
          <button className="nav-btn" onClick={() => onNavigate?.('links')}>Ссылки</button>
          <button className="nav-btn" onClick={() => onNavigate?.('settings')}>Настройки</button>
        </div>
        <div className="header-actions">
          <button onClick={handleLogout} className="logout-btn">Выйти</button>
        </div>
      </header>

      <div className="admin-content">
        <div className="toolbar">
          <div className="toolbar-filters">
            <label>
              Период:
              <select value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
                {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                  <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading">Загрузка...</div>
        ) : !stats ? (
          <div className="empty-state">Нет данных</div>
        ) : (
          <div className="stats-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
            marginTop: 24,
          }}>
            <div className="stats-card" style={cardStyle}>
              <div style={labelStyle}>Заказов за период</div>
              <div style={valueStyle}>{stats.total_orders}</div>
            </div>

            <div className="stats-card" style={cardStyle}>
              <div style={labelStyle}>Выручка (оплачено)</div>
              <div style={valueStyle}>{formatPrice(stats.revenue)}</div>
              <div style={hintStyle}>Учитываются: новые + отправленные</div>
            </div>

            <div className="stats-card" style={cardStyle}>
              <div style={labelStyle}>Средний чек</div>
              <div style={valueStyle}>{formatPrice(stats.avg_check)}</div>
            </div>

            <div className="stats-card" style={{ ...cardStyle, gridColumn: '1 / -1' }}>
              <div style={labelStyle}>По статусам</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12 }}>
                {(Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>).map((s) => (
                  <div key={s} style={{ minWidth: 120 }}>
                    <div style={{ fontSize: '0.85em', opacity: 0.7 }}>{STATUS_LABELS[s]}</div>
                    <div style={{ fontSize: '1.4em', fontWeight: 600 }}>{stats.by_status[s] || 0}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #ece6e1',
  borderRadius: '0 24px 0 24px',
  padding: '24px 28px',
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.75em',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#6b6b6b',
  marginBottom: 10,
}

const valueStyle: React.CSSProperties = {
  fontSize: '2.2em',
  fontWeight: 400,
  fontFamily: "'Forum', serif",
  letterSpacing: '0.03em',
  color: '#2f2f2f',
}

const hintStyle: React.CSSProperties = {
  fontSize: '0.75em',
  letterSpacing: '0.06em',
  color: '#6b6b6b',
  marginTop: 6,
}
