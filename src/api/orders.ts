// API-клиент для создания заказов

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || 'https://admin.businitti.ru'

export type DeliveryService = 'cdek' | 'yandex_market'

export type OrderItemInput = {
  slug: string
  quantity: number
}

export type CreateOrderInput = {
  customer_name: string
  customer_phone: string
  customer_email: string
  delivery_service: DeliveryService
  delivery_address: string
  items: OrderItemInput[]
}

export type CreateOrderResponse = {
  order_id: string
  display_id: number
  inv_id: number
  delivery_rub: number
  total_rub: number
  payment_url: string
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResponse> {
  const res = await fetch(`${API_BASE}/api/public/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody.error || `failed_to_create_order_${res.status}`)
  }
  return res.json() as Promise<CreateOrderResponse>
}

export type DeliveryPrices = Record<DeliveryService, { price: number; label: string }>

export async function fetchDeliveryPrices(): Promise<DeliveryPrices> {
  const res = await fetch(`${API_BASE}/api/public/delivery-prices`)
  if (!res.ok) throw new Error(`failed_to_load_delivery_prices`)
  return res.json() as Promise<DeliveryPrices>
}
