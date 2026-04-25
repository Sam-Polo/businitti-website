import { useParams } from 'react-router-dom'

const categoryNames: Record<string, string> = {
  necklaces: 'Колье',
  bracelets: 'Браслеты',
  earrings: 'Серьги',
  pearl: 'Изделия из жемчуга',
  sets: 'Комплекты',
  beach: 'Пляжная коллекция',
  boho: 'Бохо-этно',
}

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const title = slug ? categoryNames[slug] ?? slug : 'Категория'

  return (
    <main className="category-page">
      <h1>{title}</h1>
    </main>
  )
}
