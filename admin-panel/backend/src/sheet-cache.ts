import { logger } from './logger.js'

// Кеш данных из Google Sheets для публичного API сайта.
//
// Чтение из Sheets занимает секунды, а иногда падает (квоты, сеть до Google), поэтому:
// - stale-while-revalidate: после TTL отдаём прошлые данные сразу, а обновляем их в фоне —
//   посетитель никогда не ждёт Google, если данные уже были загружены;
// - одновременные запросы делят одну загрузку — всплеск трафика на истёкшем кеше
//   больше не превращается в десятки параллельных чтений Sheets;
// - при ошибке загрузки продолжаем отдавать последние удачные данные, а не пустоту;
// - после ошибки фоновые обновления на время притормаживаются, чтобы не добивать квоту.

const RETRY_AFTER_FAILURE_MS = 15_000

export type SheetCacheOptions<T> = {
  ttlMs: number
  // что отдать, если данных ещё ни разу не было и загрузка упала; без него — бросаем ошибку
  fallback?: () => T
}

export type SheetCache<T> = {
  // fresh: если TTL истёк — дождаться свежих данных (для заказов), а не брать прошлые;
  // при ошибке загрузки всё равно вернутся прошлые данные
  get(opts?: { fresh?: boolean }): Promise<T>
  // сброс после правки из админки: следующий запрос дождётся свежих данных
  invalidate(): void
  // прогрев при старте сервера, чтобы первые посетители не ждали Sheets
  warm(): void
}

export function createSheetCache<T>(
  name: string,
  load: () => Promise<T>,
  options: SheetCacheOptions<T>
): SheetCache<T> {
  let entry: { data: T; loadedAt: number } | null = null
  // данные из entry устарели из-за правки в админке — отдавать их можно только при ошибке
  let dirty = false
  let inflight: Promise<T> | null = null
  // растёт при каждом invalidate: загрузка, начатая до правки, не должна записать
  // в кеш данные, прочитанные до неё
  let generation = 0
  let lastFailureAt = 0

  function refresh(): Promise<T> {
    if (inflight) return inflight
    const startedGeneration = generation
    const startedAt = Date.now()
    const promise = load()
      .then((data) => {
        if (startedGeneration === generation) {
          entry = { data, loadedAt: Date.now() }
          dirty = false
        }
        return data
      })
      .catch((err: any) => {
        lastFailureAt = Date.now()
        logger.warn({ cache: name, err: err?.message, ms: Date.now() - startedAt }, 'не удалось обновить кеш из Google Sheets')
        throw err
      })
      .finally(() => {
        if (inflight === promise) inflight = null
      })
    inflight = promise
    return promise
  }

  function refreshInBackground() {
    if (inflight || Date.now() - lastFailureAt < RETRY_AFTER_FAILURE_MS) return
    // ошибка уже залогирована в refresh(); здесь её только гасим
    refresh().catch(() => {})
  }

  async function get(opts: { fresh?: boolean } = {}): Promise<T> {
    if (entry && !dirty) {
      const expired = Date.now() - entry.loadedAt >= options.ttlMs
      if (!expired) return entry.data
      if (!opts.fresh) {
        refreshInBackground()
        return entry.data
      }
    }

    try {
      return await refresh()
    } catch (err) {
      if (entry) return entry.data
      if (options.fallback) return options.fallback()
      throw err
    }
  }

  function invalidate() {
    generation++
    dirty = true
    inflight = null
  }

  function warm() {
    refresh().catch(() => {})
  }

  return { get, invalidate, warm }
}
