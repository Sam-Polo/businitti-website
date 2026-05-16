import { useState, useEffect, useRef } from 'react'
import { api, removeToken } from './api'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import './App.css'

type Category = {
  key: string
  title: string
  description?: string
  image: string
  image_position?: string
  order: number
}

const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

function SortableCategoryRow({
  category,
  onEdit
}: {
  category: Category
  onEdit: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: category.key })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <tr ref={setNodeRef} style={style} className={isDragging ? 'dragging' : ''}>
      <td>
        <span className="drag-handle" {...attributes} {...listeners}>⋮⋮</span>
      </td>
      <td>
        <div
          className="category-row-preview"
          style={{
            backgroundImage: category.image ? `url(${category.image})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: category.image_position || 'center'
          }}
        />
      </td>
      <td>{category.key}</td>
      <td><span className="bn-display" style={{ textTransform: 'uppercase', fontSize: '1.05rem' }}>{category.title}</span></td>
      <td>{category.description || '—'}</td>
      <td>
        <button type="button" className="btn-icon btn-edit" onClick={onEdit} title="Редактировать"><EditIcon /></button>
      </td>
    </tr>
  )
}

function CategoriesPage({
  onNavigate,
  newOrdersCount
}: {
  onNavigate?: (page: 'products' | 'categories' | 'orders' | 'stats') => void
  newOrdersCount?: number
}) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState<{ key: string; title: string; description: string; image: string }>({
    key: '',
    title: '',
    description: '',
    image: ''
  })
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const data = await api.getCategories()
      const list = (data.categories || []).map((c: Category, i: number) => ({ ...c, order: i }))
      setCategories(list)
    } catch (error: any) {
      showToast(error.message || 'Ошибка загрузки категорий', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
  }

  const handleLogout = () => {
    removeToken()
    window.location.reload()
  }

  const handleEdit = (c: Category) => {
    setEditingCategory(c)
    setFormData({
      key: c.key,
      title: c.title,
      description: c.description || '',
      image: c.image || ''
    })
    setIsModalOpen(true)
  }

  const saveCategories = async (list: Category[]) => {
    try {
      await api.saveCategories(list.map(({ key, title, description, image, image_position }) => ({
        key,
        title,
        description: description || undefined,
        image,
        image_position: image_position || 'center'
      })))
      setCategories(list)
      showToast('Категории сохранены', 'success')
      loadCategories()
    } catch (error: any) {
      showToast(error.message || 'Ошибка сохранения', 'error')
    }
  }

  const handleSave = async () => {
    const { key, title, description, image } = formData
    if (!key.trim()) {
      showToast('Укажите ключ (имя листа в таблице)', 'error')
      return
    }
    if (!title.trim()) {
      showToast('Укажите название', 'error')
      return
    }
    const normalizedKey = key.trim().toLowerCase()
    const existing = categories.find((c) => c.key.toLowerCase() === normalizedKey && c.key !== editingCategory?.key)
    if (existing) {
      showToast('Категория с таким ключом уже есть', 'error')
      return
    }

    const imagePosition = 'center'
    let next: Category[]
    if (editingCategory) {
      next = categories.map((c) =>
        c.key === editingCategory.key
          ? { ...c, key: normalizedKey, title: title.trim(), description: description.trim() || undefined, image, image_position: imagePosition }
          : c
      )
    } else {
      next = [
        ...categories,
        { key: normalizedKey, title: title.trim(), description: description.trim() || undefined, image, image_position: imagePosition, order: categories.length }
      ]
    }
    await saveCategories(next)
    setIsModalOpen(false)
  }

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      const url = await api.uploadImage(file)
      setFormData((prev) => ({ ...prev, image: url }))
    } catch (error: any) {
      showToast(error.message || 'Ошибка загрузки фото', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const file = files[0]
    if (allowed.includes(file.type.toLowerCase())) {
      handleFileUpload(file)
    } else {
      showToast('Поддерживаются JPG, PNG, WebP', 'error')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = categories.findIndex((c) => c.key === active.id)
    const newIndex = categories.findIndex((c) => c.key === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      const next = arrayMove(categories, oldIndex, newIndex).map((c, i) => ({ ...c, order: i }))
      setCategories(next)
      saveCategories(next)
    }
  }

  if (loading) {
    return <div className="loading">Загрузка...</div>
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Админ-панель - BUSINITTI</h1>
        <div className="header-nav">
          <button className="nav-btn" onClick={() => onNavigate?.('products')}>
            Товары
          </button>
          <button className="nav-btn active" onClick={() => onNavigate?.('categories')}>
            Категории
          </button>
          <button className="nav-btn" onClick={() => onNavigate?.('orders')}>
            Заказы
            {!!newOrdersCount && newOrdersCount > 0 && (
              <span className="nav-badge" style={{ marginLeft: 6 }}>{newOrdersCount}</span>
            )}
          </button>
          <button className="nav-btn" onClick={() => onNavigate?.('stats')}>
            Статистика
          </button>
        </div>
        <div className="header-actions">
          <button onClick={handleLogout} className="logout-btn">
            Выйти
          </button>
        </div>
      </header>

      <div className="categories-content">
        <p className="categories-hint">
          Категории фиксированы на сайте. Здесь можно редактировать описание и фото для каждой категории. Ключ — имя листа в Google Таблице с товарами.
        </p>
        {categories.length === 0 ? (
          <div className="empty-state">
            <p>Нет категорий. Создайте стандартные категории Businitti.</p>
            <button
              type="button"
              className="btn btn-add"
              onClick={async () => {
                const seed: Category[] = [
                  { key: 'necklaces', title: 'Колье', description: 'Элегантные колье ручной работы из натуральных камней', image: '', image_position: '50% 50%', order: 0 },
                  { key: 'bracelets', title: 'Браслеты', description: 'Изящные браслеты из натуральных камней', image: '', image_position: '50% 50%', order: 1 },
                  { key: 'earrings', title: 'Серьги', description: 'Утончённые серьги из натуральных камней', image: '', image_position: '50% 50%', order: 2 },
                  { key: 'pearl', title: 'Изделия из жемчуга', description: 'Украшения из натурального жемчуга', image: '', image_position: '50% 50%', order: 3 },
                  { key: 'sets', title: 'Комплекты', description: 'Готовые комплекты украшений', image: '', image_position: '50% 50%', order: 4 },
                  { key: 'beach', title: 'Пляжная коллекция', description: 'Украшения для пляжного сезона', image: '', image_position: '50% 50%', order: 5 },
                  { key: 'boho', title: 'Бохо-Этно', description: 'Украшения в стиле бохо и этно', image: '', image_position: '50% 50%', order: 6 }
                ]
                await saveCategories(seed)
              }}
            >
              Создать стандартные категории
            </button>
          </div>
        ) : (
          <div className="categories-table-wrapper">
            <table className="categories-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Фото</th>
                  <th>Ключ</th>
                  <th>Название</th>
                  <th>Описание</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={categories.map((c) => c.key)} strategy={verticalListSortingStrategy}>
                    {categories.map((category) => (
                      <SortableCategoryRow
                        key={category.key}
                        category={category}
                        onEdit={() => handleEdit(category)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
          <button className="toast-close" onClick={() => setToast(null)}>×</button>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false) }}>
          <div className="modal-content modal-form" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            <h2>Редактировать категорию</h2>
            <div className="form-group">
              <label>Ключ (имя листа в Google Таблице) *</label>
              <input
                type="text"
                value={formData.key}
                onChange={(e) => setFormData((p) => ({ ...p, key: e.target.value }))}
                placeholder="например: ягоды"
                disabled={!!editingCategory}
              />
              {editingCategory && <small>Ключ нельзя изменить</small>}
            </div>
            <div className="form-group">
              <label>Название *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                placeholder="Ягоды"
              />
            </div>
            <div className="form-group">
              <label>Описание</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Эксклюзивная коллекция..."
              />
            </div>
            <div className="form-group">
              <label>Фото категории *</label>
              <div className="image-upload-area">
                <input
                  type="file"
                  ref={fileInputRef}
                  id="category-image-input"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <label htmlFor="category-image-input" className="image-upload-button">
                  {uploading ? 'Загрузка...' : 'Загрузить фото'}
                </label>
                {formData.image && (
                  <div
                    className="category-form-preview"
                    style={{
                      backgroundImage: `url(${formData.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  />
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-cancel" onClick={() => setIsModalOpen(false)}>Отмена</button>
              <button type="button" className="btn btn-confirm" onClick={handleSave}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CategoriesPage
