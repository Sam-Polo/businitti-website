const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || 'https://admin.businitti.ru'

export type PublicCategory = {
  key: string
  title: string
  description: string
  image: string
  image_position: string
}

export async function fetchPublicCategories(): Promise<PublicCategory[]> {
  const res = await fetch(`${API_BASE}/api/public/categories`)
  if (!res.ok) throw new Error(`failed_to_load_categories: ${res.status}`)
  const data = await res.json()
  return data.categories as PublicCategory[]
}
