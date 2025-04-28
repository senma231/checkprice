/**
 * 简单的内存缓存实现
 * 在实际生产环境中，应该使用Redis等分布式缓存系统
 */

interface CacheItem<T> {
  value: T;
  expiry: number | null; // null表示永不过期
}

class MemoryCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  
  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒），默认为5分钟，设为null表示永不过期
   */
  set<T>(key: string, value: T, ttl: number | null = 300): void {
    const expiry = ttl === null ? null : Date.now() + ttl * 1000;
    this.cache.set(key, { value, expiry });
  }
  
  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存值，如果不存在或已过期则返回null
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // 检查是否过期
    if (item.expiry !== null && item.expiry < Date.now()) {
      this.delete(key);
      return null;
    }
    
    return item.value as T;
  }
  
  /**
   * 删除缓存
   * @param key 缓存键
   */
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * 获取或设置缓存
   * @param key 缓存键
   * @param fetcher 获取数据的函数
   * @param ttl 过期时间（秒）
   * @returns 缓存值或fetcher返回的值
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl: number | null = 300): Promise<T> {
    const cachedValue = this.get<T>(key);
    
    if (cachedValue !== null) {
      return cachedValue;
    }
    
    const value = await fetcher();
    this.set(key, value, ttl);
    return value;
  }
  
  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expiry !== null && item.expiry < now) {
        this.cache.delete(key);
      }
    }
  }
}

// 创建单例实例
const cache = new MemoryCache();

// 定期清理过期缓存（每10分钟）
if (typeof window !== 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 10 * 60 * 1000);
}

export default cache;
