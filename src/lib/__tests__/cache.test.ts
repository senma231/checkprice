import cache from '../cache';

describe('Cache Service', () => {
  beforeEach(() => {
    // 每个测试前清空缓存
    cache.clear();
  });

  it('should set and get a value', () => {
    cache.set('test-key', 'test-value');
    expect(cache.get('test-key')).toBe('test-value');
  });

  it('should return null for non-existent key', () => {
    expect(cache.get('non-existent')).toBeNull();
  });

  it('should delete a value', () => {
    cache.set('test-key', 'test-value');
    cache.delete('test-key');
    expect(cache.get('test-key')).toBeNull();
  });

  it('should clear all values', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
  });

  it('should expire values after TTL', () => {
    jest.useFakeTimers();
    
    cache.set('test-key', 'test-value', 1); // 1秒后过期
    
    expect(cache.get('test-key')).toBe('test-value');
    
    // 快进2秒
    jest.advanceTimersByTime(2000);
    
    expect(cache.get('test-key')).toBeNull();
    
    jest.useRealTimers();
  });

  it('should not expire values with null TTL', () => {
    jest.useFakeTimers();
    
    cache.set('test-key', 'test-value', null); // 永不过期
    
    expect(cache.get('test-key')).toBe('test-value');
    
    // 快进1小时
    jest.advanceTimersByTime(60 * 60 * 1000);
    
    expect(cache.get('test-key')).toBe('test-value');
    
    jest.useRealTimers();
  });

  it('should cleanup expired values', () => {
    jest.useFakeTimers();
    
    cache.set('key1', 'value1', 1); // 1秒后过期
    cache.set('key2', 'value2', 10); // 10秒后过期
    
    // 快进5秒
    jest.advanceTimersByTime(5000);
    
    // 手动清理
    cache.cleanup();
    
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBe('value2');
    
    jest.useRealTimers();
  });

  it('should get or set a value using getOrSet', async () => {
    const fetcher = jest.fn().mockResolvedValue('fetched-value');
    
    // 首次调用应该执行fetcher
    const value1 = await cache.getOrSet('test-key', fetcher);
    expect(value1).toBe('fetched-value');
    expect(fetcher).toHaveBeenCalledTimes(1);
    
    // 再次调用应该从缓存获取
    const value2 = await cache.getOrSet('test-key', fetcher);
    expect(value2).toBe('fetched-value');
    expect(fetcher).toHaveBeenCalledTimes(1); // 不应该再次调用
  });

  it('should call fetcher again after TTL expires', async () => {
    jest.useFakeTimers();
    
    const fetcher = jest.fn().mockResolvedValue('fetched-value');
    
    // 首次调用
    await cache.getOrSet('test-key', fetcher, 1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    
    // 快进2秒
    jest.advanceTimersByTime(2000);
    
    // 再次调用
    await cache.getOrSet('test-key', fetcher, 1);
    expect(fetcher).toHaveBeenCalledTimes(2); // 应该再次调用
    
    jest.useRealTimers();
  });
});
