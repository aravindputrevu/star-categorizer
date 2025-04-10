/**
 * Persistent cache service that supports both KV and in-memory storage
 */

export interface CacheEntry<T> {
  value: T;
  expiry: number;
}

export class CacheService<T> {
  private namespace: KVNamespace | null;
  private memoryCache: Map<string, CacheEntry<T>>;
  private prefix: string;
  
  constructor(namespace?: KVNamespace, prefix: string = '') {
    this.namespace = namespace || null;
    this.memoryCache = new Map();
    this.prefix = prefix;
  }
  
  async get(key: string): Promise<T | null> {
    const cacheKey = `${this.prefix}${key}`;
    
    // Try memory cache first for edge functions
    const memoryEntry = this.memoryCache.get(cacheKey);
    if (memoryEntry && Date.now() < memoryEntry.expiry) {
      return memoryEntry.value;
    }
    
    // If KV namespace is available, try it
    if (this.namespace) {
      try {
        const kvData = await this.namespace.get(cacheKey, { type: 'json' });
        if (kvData) {
          const entry = kvData as CacheEntry<T>;
          
          // Check expiration
          if (entry.expiry && Date.now() > entry.expiry) {
            await this.namespace.delete(cacheKey);
            return null;
          }
          
          // Update memory cache
          this.memoryCache.set(cacheKey, entry);
          return entry.value;
        }
      } catch (error) {
        console.error('KV cache error:', error);
        // Fall back to memory cache on KV error
      }
    }
    
    return null;
  }
  
  async set(key: string, value: T, ttlMinutes: number = 60): Promise<void> {
    const cacheKey = `${this.prefix}${key}`;
    const entry: CacheEntry<T> = {
      value,
      expiry: Date.now() + (ttlMinutes * 60 * 1000)
    };
    
    // Update memory cache
    this.memoryCache.set(cacheKey, entry);
    
    // If KV namespace is available, update it too
    if (this.namespace) {
      try {
        await this.namespace.put(cacheKey, JSON.stringify(entry));
      } catch (error) {
        console.error('KV cache set error:', error);
        // Continue even if KV fails, we still have memory cache
      }
    }
  }
  
  async delete(key: string): Promise<void> {
    const cacheKey = `${this.prefix}${key}`;
    
    // Remove from memory cache
    this.memoryCache.delete(cacheKey);
    
    // If KV namespace is available, remove it from there too
    if (this.namespace) {
      try {
        await this.namespace.delete(cacheKey);
      } catch (error) {
        console.error('KV cache delete error:', error);
      }
    }
  }
}
