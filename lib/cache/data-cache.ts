/**
 * Cache semplice per dati caricati
 * Previene ricaricamenti multipli durante la navigazione
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly TTL = 5 * 60 * 1000 // 5 minuti

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Controlla se i dati sono ancora validi
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }
}

// Singleton
export const dataCache = new DataCache()
