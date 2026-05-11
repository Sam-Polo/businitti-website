import { useEffect, useMemo, useState } from 'react'
import { api, removeToken, type Order, type OrderStatus, type OrderWithItems } from './api'
import './App.css'

type NavPage = 'products' | 'categories' | 'orders' | 'stats'

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Ожидает оплаты',
  new: 'Новый',
  shipped: 'Отправлен',
  cancelled: 'Отменён',
  refunded: 'Возврат',
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending_payment: '#9ca3af',
  new: '#bf9243',
  shipped: '#10b981',
  cancelled: '#6b7280',
  refunded: '#ef4444',
}

const DELIVERY_LABELS = {
  cdek: 'СДЭК',
  yandex_market: 'Яндекс Маркет',
}

function formatDate(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function formatPrice(rub: number): string {
  return `${(rub || 0).toLocaleString('ru-RU')} ₽`
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className="order-status-badge"
      style={{
        backgroundColor: STATUS_COLORS[status],
        color: 'white',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '0.85em',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

export default function OrdersPage({ onNavigate, newCount }: {
  onNavigate?: (page: NavPage) => void
  newCount?: number
}) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api.getOrders({ status: statusFilter, search })
      .then((data) => setOrders(data.orders || []))
      .catch((e) => setError(e?.message || 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [statusFilter, search, reloadKey])

  const handleLogout = () => {
    removeToken()
    window.location.reload()
  }

  const filteredOrders = useMemo(() => orders, [orders])

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Админ-панель - BUSINITTI</h1>
        <div className="header-nav">
          <button className="nav-btn" onClick={() => onNavigate?.('products')}>Товары</button>
          <button className="nav-btn" onClick={() => onNavigate?.('categories')}>Категории</button>
          <button className="nav-btn active" onClick={() => onNavigate?.('orders')}>
            Заказы
            {!!newCount && newCount > 0 && (
              <span className="nav-badge" style={{ marginLeft: 6 }}>{newCount}</span>
            )}
          </button>
          <button className="nav-btn" onClick={() => onNavigate?.('stats')}>Статистика</button>
        </div>
        <div className="header-actions">
          <button onClick={handleLogout} className="logout-btn">Выйти</button>
        </div>
      </header>

      <div className="admin-content">
        <div className="toolbar">
          <div className="toolbar-filters">
            <label>
              Статус:
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Все</option>
                <option value="new">Новые</option>
                <option value="pending_payment">Ожидают оплаты</option>
                <option value="shipped">Отправленные</option>
                <option value="cancelled">Отменённые</option>
                <option value="refunded">Возвраты</option>
              </select>
            </label>
            <label className="search-label">
              Поиск:
              <input
                type="text"
                placeholder="имя, телефон, email или №"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading">Загрузка заказов...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">Заказов нет</div>
        ) : (
          <div className="orders-list">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>№</th>
                  <th>Статус</th>
                  <th>Дата</th>
                  <th>Клиент</th>
                  <th>Контакты</th>
                  <th>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className="orders-row"
                    style={{ cursor: 'pointer' }}
                  >
                    <td data-label="№"><strong>#{order.display_id}</strong></td>
                    <td data-label="Статус"><StatusBadge status={order.status} /></td>
                    <td data-label="Дата">{formatDate(order.created_at)}</td>
                    <td data-label="Клиент">{order.customer_name}</td>
                    <td data-label="Контакты">
                      <div style={{ fontSize: '0.9em' }}>{order.customer_phone}</div>
                      <div style={{ fontSize: '0.85em', opacity: 0.7 }}>{order.customer_email}</div>
                    </td>
                    <td data-label="Сумма"><strong>{formatPrice(order.total_rub)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      )}
    </div>
  )
}

function OrderDetailModal({ orderId, onClose, onChanged }: {
  orderId: string
  onClose: () => void
  onChanged: () => void
}) {
  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.getOrder(orderId)
      .then((data) => setOrder(data.order))
      .catch((e) => setError(e?.message || 'Ошибка'))
      .finally(() => setLoading(false))
  }, [orderId])

  const handleChangeStatus = async (status: OrderStatus) => {
    if (!order) return
    setSaving(true)
    try {
      await api.updateOrderStatus(order.id, status)
      onChanged()
      // обновляем локально
      setOrder({ ...order, status, updated_at: new Date().toISOString() })
    } catch (e: any) {
      setError(e?.message || 'Ошибка смены статуса')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!order) return
    setSaving(true)
    try {
      await api.deleteOrder(order.id)
      onChanged()
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Ошибка удаления')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <button className="modal-close" onClick={onClose}>&times;</button>

        {loading ? (
          <div className="loading">Загрузка...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : !order ? (
          <div>Заказ не найден</div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Заказ #{order.display_id}</h2>
              <StatusBadge status={order.status} />
            </div>

            <div className="detail-row">
              <span className="detail-label">Создан:</span>
              <span className="detail-value">{formatDate(order.created_at)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Обновлён:</span>
              <span className="detail-value">{formatDate(order.updated_at)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">InvId (Робокасса):</span>
              <span className="detail-value">{order.inv_id}</span>
            </div>

            <h3 style={{ marginTop: 20 }}>Клиент</h3>
            <div className="detail-row">
              <span className="detail-label">Имя:</span>
              <span className="detail-value">{order.customer_name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Телефон:</span>
              <span className="detail-value">{order.customer_phone}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Email:</span>
              <span className="detail-value">{order.customer_email}</span>
            </div>

            <h3 style={{ marginTop: 20 }}>Доставка</h3>
            <div className="detail-row">
              <span className="detail-label">Способ:</span>
              <span className="detail-value">{DELIVERY_LABELS[order.delivery_service]}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Адрес пункта выдачи:</span>
              <span className="detail-value">{order.delivery_address}</span>
            </div>

            <h3 style={{ marginTop: 20 }}>Позиции</h3>
            <div className="order-items-list">
              {order.items.map((item, i) => (
                <div key={i} className="order-item-row" style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #eee' }}>
                  {item.product_image && (
                    <img
                      src={item.product_image}
                      alt={item.product_title}
                      style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div><strong>{item.product_title}</strong></div>
                    {item.product_article && (
                      <div style={{ fontSize: '0.85em', opacity: 0.7 }}>Артикул: {item.product_article}</div>
                    )}
                    <div style={{ fontSize: '0.9em' }}>
                      {formatPrice(item.price_rub)} × {item.quantity} = <strong>{formatPrice(item.subtotal_rub)}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, fontSize: '1.2em', textAlign: 'right' }}>
              Итого: <strong>{formatPrice(order.total_rub)}</strong>
            </div>

            <div className="modal-actions" style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {order.status === 'new' && (
                <button
                  className="btn btn-primary"
                  disabled={saving}
                  onClick={() => handleChangeStatus('shipped')}
                >
                  Отметить отправленным
                </button>
              )}
              {(order.status === 'new' || order.status === 'pending_payment') && (
                <button
                  className="btn btn-secondary"
                  disabled={saving}
                  onClick={() => handleChangeStatus('cancelled')}
                >
                  Отменить
                </button>
              )}
              {(order.status === 'new' || order.status === 'shipped') && (
                <button
                  className="btn btn-secondary"
                  disabled={saving}
                  onClick={() => handleChangeStatus('refunded')}
                >
                  Отметить возврат
                </button>
              )}
              {(order.status === 'cancelled' || order.status === 'refunded') && (
                <button
                  className="btn btn-secondary"
                  disabled={saving}
                  onClick={() => handleChangeStatus('new')}
                >
                  Вернуть в «Новый»
                </button>
              )}
              <button
                className="btn btn-danger"
                disabled={saving}
                onClick={() => setConfirmDelete(true)}
                style={{ marginLeft: 'auto' }}
              >
                Удалить заказ
              </button>
            </div>

            {confirmDelete && (
              <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setConfirmDelete(false)}>
                <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
                  <h3>Удалить заказ?</h3>
                  <p>Заказ <strong>#{order.display_id}</strong> будет удалён вместе со всеми позициями. Это действие необратимо.</p>
                  <div className="confirm-actions">
                    <button className="btn btn-cancel" disabled={saving} onClick={() => setConfirmDelete(false)}>Отмена</button>
                    <button className="btn btn-confirm" disabled={saving} onClick={handleDelete}>Удалить</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
