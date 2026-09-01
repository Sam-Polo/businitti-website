import { Fragment, useState, useEffect, useRef, type ReactNode } from 'react'
import { api, removeToken } from './api'
import RichTextEditor from './RichTextEditor'
import { IMAGE_ACCEPT, IMAGE_FORMATS_HINT, isSupportedImageFile } from './utils'
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
  active: boolean
}

const PROTECTED_KEYS = new Set(['sale'])

// карта транслитерации (упрощённый ГОСТ)
const TRANSLIT_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

function transliterate(input: string): string {
  return (input || '')
    .toLowerCase()
    .split('')
    .map((ch) => (TRANSLIT_MAP[ch] !== undefined ? TRANSLIT_MAP[ch] : ch))
    .join('')
    .replace(/[^a-z0-9_-]+/g, '-')  // всё что не a-z0-9_- → дефис
    .replace(/^-+|-+$/g, '')          // обрезаем дефисы по краям
    .replace(/-{2,}/g, '-')           // схлопываем подряд идущие
    .slice(0, 40)
}

// рендер описания категории в таблице с поддержкой [[ ]] и переносов строк
const ACCENT_RE = /\[\[([\s\S]+?)\]\]/g
function DescriptionPreview({ text }: { text: string }) {
  const out: ReactNode[] = []
  const safe = text.replace(/\r\n/g, '\n')
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  ACCENT_RE.lastIndex = 0
  while ((m = ACCENT_RE.exec(safe)) !== null) {
    if (m.index > last) out.push(<Fragment key={`t${i}`}>{safe.slice(last, m.index)}</Fragment>)
    out.push(<span key={`a${i}`} style={{ color: '#f5a2b7' }}>{m[1]}</span>)
    last = m.index + m[0].length
    i++
  }
  if (last < safe.length) out.push(<Fragment key="end">{safe.slice(last)}</Fragment>)
  return <span style={{ whiteSpace: 'pre-line' }}>{out}</span>
}

const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

function SortableCategoryRow({
  category,
  onEdit,
  onDelete,
}: {
  category: Category
  onEdit: () => void
  onDelete: () => void
}) {
  const isProtected = PROTECTED_KEYS.has(category.key)
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
      <td>{category.key}{isProtected && <span className="category-row-tag">авто</span>}</td>
      <td><span className="bn-display" style={{ textTransform: 'uppercase', fontSize: '1.05rem' }}>{category.title}</span></td>
      <td>{category.description ? <DescriptionPreview text={category.description} /> : '—'}</td>
      <td>
        {category.active === false ? (
          <span className="category-row-tag category-row-tag--hidden">скрыта</span>
        ) : (
          <span className="category-row-tag category-row-tag--visible">видна</span>
        )}
      </td>
      <td>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button type="button" className="btn-icon btn-edit" onClick={onEdit} title="Редактировать"><EditIcon /></button>
          {!isProtected && (
            <button type="button" className="btn-icon btn-delete" onClick={onDelete} title="Удалить">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

function CategoriesPage({
  onNavigate,
  newOrdersCount
}: {
  onNavigate?: (page: 'products' | 'categories' | 'orders' | 'stats' | 'content' | 'links' | 'settings') => void
  newOrdersCount?: number
}) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAddMode, setIsAddMode] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState<{ key: string; title: string; description: string; image: string; active: boolean }>({
    key: '',
    title: '',
    description: '',
    image: '',
    active: true,
  })
  const [uploading, setUploading] = useState(false)
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ category: Category; count: number; loading: boolean } | null>(null)
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
    setIsAddMode(false)
    setKeyManuallyEdited(true) // в edit-режиме ключ нельзя менять, transliterate не нужен
    setFormData({
      key: c.key,
      title: c.title,
      description: c.description || '',
      image: c.image || '',
      active: c.active !== false,
    })
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setEditingCategory(null)
    setIsAddMode(true)
    setKeyManuallyEdited(false)
    setFormData({ key: '', title: '', description: '', image: '', active: true })
    setIsModalOpen(true)
  }

  const handleTitleChange = (next: string) => {
    setFormData((p) => ({
      ...p,
      title: next,
      // в режиме добавления автогенерируем slug, пока пользователь не правил его руками
      key: isAddMode && !keyManuallyEdited ? transliterate(next) : p.key,
    }))
  }

  const handleKeyChange = (next: string) => {
    setKeyManuallyEdited(true)
    setFormData((p) => ({ ...p, key: next.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))
  }

  const saveCategories = async (list: Category[]) => {
    try {
      await api.saveCategories(list.map(({ key, title, description, image, image_position, active }) => ({
        key,
        title,
        description: description || undefined,
        image,
        image_position: image_position || 'center',
        active,
      })))
      setCategories(list)
      showToast('Категории сохранены', 'success')
      loadCategories()
    } catch (error: any) {
      showToast(error.message || 'Ошибка сохранения', 'error')
    }
  }

  const handleSave = async () => {
    const { key, title, description, image, active } = formData
    if (!title.trim()) {
      showToast('Укажите название', 'error')
      return
    }
    const normalizedKey = key.trim().toLowerCase()
    if (!normalizedKey) {
      showToast('Укажите ключ', 'error')
      return
    }
    if (!/^[a-z][a-z0-9_-]{1,40}$/.test(normalizedKey)) {
      showToast('Ключ: латинские буквы, цифры, дефис и подчёркивание; должен начинаться с буквы', 'error')
      return
    }
    if (isAddMode) {
      const dup = categories.find((c) => c.key.toLowerCase() === normalizedKey)
      if (dup) {
        showToast('Категория с таким ключом уже есть', 'error')
        return
      }
      try {
        await api.createCategory({
          key: normalizedKey,
          title: title.trim(),
          description: description.trim() || undefined,
          image,
          image_position: 'center',
          active,
        })
        showToast('Категория добавлена', 'success')
        setIsModalOpen(false)
        loadCategories()
      } catch (error: any) {
        showToast(error.message || 'Ошибка создания категории', 'error')
      }
      return
    }

    // edit
    const next: Category[] = categories.map((c) =>
      c.key === editingCategory?.key
        ? { ...c, title: title.trim(), description: description.trim() || undefined, image, active }
        : c
    )
    await saveCategories(next)
    setIsModalOpen(false)
  }

  const handleDeleteRequest = async (c: Category) => {
    setDeleteConfirm({ category: c, count: 0, loading: true })
    try {
      const { count } = await api.getCategoryProductCount(c.key)
      setDeleteConfirm({ category: c, count, loading: false })
    } catch (error: any) {
      showToast(error.message || 'Не удалось подсчитать товары', 'error')
      setDeleteConfirm(null)
    }
  }

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return
    try {
      await api.deleteCategory(deleteConfirm.category.key)
      showToast('Категория удалена', 'success')
      setDeleteConfirm(null)
      loadCategories()
    } catch (error: any) {
      showToast(error.message || 'Ошибка удаления', 'error')
    }
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
    const file = files[0]
    if (isSupportedImageFile(file)) {
      handleFileUpload(file)
    } else {
      showToast(`Поддерживаются ${IMAGE_FORMATS_HINT}`, 'error')
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
          <button className="nav-btn" onClick={() => onNavigate?.('content')}>
            Контент
          </button>
          <button className="nav-btn" onClick={() => onNavigate?.('links')}>
            Ссылки
          </button>
          <button className="nav-btn" onClick={() => onNavigate?.('settings')}>
            Настройки
          </button>
        </div>
        <div className="header-actions">
          <button onClick={handleLogout} className="logout-btn">
            Выйти
          </button>
        </div>
      </header>

      <div className="categories-content">
        <div className="categories-toolbar">
          <p className="categories-hint">
            Перетащите строку, чтобы изменить порядок отображения на сайте. Ключ — имя листа в Google Таблице с товарами.
          </p>
          <button type="button" className="btn-add" onClick={handleAdd}>+ Добавить категорию</button>
        </div>
        {categories.length === 0 ? (
          <div className="empty-state">
            <p>Нет категорий. Создайте стандартные категории Businitti.</p>
            <button
              type="button"
              className="btn btn-add"
              onClick={async () => {
                const seed: Category[] = [
                  { key: 'necklaces', title: 'Колье', description: 'Элегантные колье ручной работы из натуральных камней', image: '', image_position: '50% 50%', order: 0, active: true },
                  { key: 'bracelets', title: 'Браслеты', description: 'Изящные браслеты из натуральных камней', image: '', image_position: '50% 50%', order: 1, active: true },
                  { key: 'earrings', title: 'Серьги', description: 'Утончённые серьги из натуральных камней', image: '', image_position: '50% 50%', order: 2, active: true },
                  { key: 'pearl', title: 'Изделия из жемчуга', description: 'Украшения из натурального жемчуга', image: '', image_position: '50% 50%', order: 3, active: true },
                  { key: 'sets', title: 'Комплекты', description: 'Готовые комплекты украшений', image: '', image_position: '50% 50%', order: 4, active: true },
                  { key: 'beach', title: 'Пляжная коллекция', description: 'Украшения для пляжного сезона', image: '', image_position: '50% 50%', order: 5, active: true },
                  { key: 'boho', title: 'Бохо-Этно', description: 'Украшения в стиле бохо и этно', image: '', image_position: '50% 50%', order: 6, active: true }
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
                  <th>Статус</th>
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
                        onDelete={() => handleDeleteRequest(category)}
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
            <h2>{isAddMode ? 'Новая категория' : 'Редактировать категорию'}</h2>
            <div className="form-group">
              <label>Название *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Например: Бохо-этно"
              />
            </div>
            <div className="form-group">
              <label>Ключ (имя листа в Google Таблице) *</label>
              <input
                type="text"
                value={formData.key}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder="напр. boho-etno"
                disabled={!!editingCategory}
              />
              {isAddMode && <small>Сгенерируется автоматически из названия (можно изменить вручную)</small>}
              {editingCategory && <small>Ключ нельзя изменить после создания</small>}
            </div>
            <div className="form-group">
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData((p) => ({ ...p, active: e.target.checked }))}
                />
                <span>Видна на сайте</span>
              </label>
              <small>Снимите галочку, чтобы скрыть категорию с сайта (товары и настройки сохранятся)</small>
            </div>
            <div className="form-group">
              <label>Описание (показывается на странице категории)</label>
              <RichTextEditor
                value={formData.description}
                onChange={(next) => setFormData((p) => ({ ...p, description: next }))}
                placeholder="Краткое описание категории. Пустая строка — новый абзац. Выделите фразу и нажмите «Розовый», чтобы её подсветить."
                rows={5}
              />
            </div>
            <div className="form-group">
              <label>Фото категории *</label>
              <div className="image-upload-area">
                <input
                  type="file"
                  ref={fileInputRef}
                  id="category-image-input"
                  accept={IMAGE_ACCEPT}
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
              <button type="button" className="btn btn-confirm" onClick={handleSave}>{isAddMode ? 'Создать' : 'Сохранить'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null) }}>
          <div className="modal-content" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Удалить категорию?</h2>
            {deleteConfirm.loading ? (
              <p>Проверяем количество товаров...</p>
            ) : (
              <>
                <p>
                  Категория <strong>«{deleteConfirm.category.title}»</strong> будет удалена вместе со всеми товарами внутри.
                </p>
                {deleteConfirm.count > 0 ? (
                  <p style={{ color: '#dc3545' }}>
                    Внутри <strong>{deleteConfirm.count}</strong> {deleteConfirm.count === 1 ? 'товар' : deleteConfirm.count < 5 ? 'товара' : 'товаров'} — они тоже будут удалены безвозвратно вместе с листом из Google Sheets.
                  </p>
                ) : (
                  <p>В категории нет товаров. Лист Google Sheets также будет удалён.</p>
                )}
                <p style={{ fontSize: '0.9em', color: 'var(--bn-text-muted)' }}>Это действие необратимо.</p>
              </>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Отмена</button>
              <button
                className="btn-order-delete"
                disabled={deleteConfirm.loading}
                onClick={handleDeleteConfirmed}
              >
                Удалить категорию
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CategoriesPage
