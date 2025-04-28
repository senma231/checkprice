import { NextRequest } from 'next/server';
import { POST } from '../route';
import { prisma, queryOptimizer } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

// 模拟依赖
jest.mock('next-auth');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    queryLog: {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      update: jest.fn().mockResolvedValue({}),
    },
  },
  queryOptimizer: {
    optimizePriceQuery: jest.fn(),
  },
}));

describe('Price Query API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 模拟会话
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: 1,
        userType: 1,
        permissions: ['price:view'],
      },
    });
    
    // 模拟查询结果
    (queryOptimizer.optimizePriceQuery as jest.Mock).mockResolvedValue({
      prices: [
        {
          id: 1,
          serviceType: 1,
          serviceId: 1,
          price: 100,
          currency: 'CNY',
          priceUnit: 'kg',
          originRegionId: 1,
          destinationRegionId: 2,
          originRegion: { id: 1, name: '中国' },
          destinationRegion: { id: 2, name: '美国' },
        },
      ],
      pagination: {
        current: 1,
        pageSize: 10,
        total: 1,
      },
    });
  });

  it('should return price query results', async () => {
    // 创建请求
    const request = new NextRequest('http://localhost:3000/api/prices/query', {
      method: 'POST',
      body: JSON.stringify({
        serviceType: 1,
        originRegionId: 1,
        destinationRegionId: 2,
        weight: 10,
      }),
    });
    
    // 调用API
    const response = await POST(request);
    const data = await response.json();
    
    // 验证结果
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.prices).toHaveLength(1);
    expect(data.data.pagination.total).toBe(1);
    
    // 验证查询优化器被调用
    expect(queryOptimizer.optimizePriceQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceType: 1,
        originRegionId: 1,
        destinationRegionId: 2,
        weight: 10,
      })
    );
    
    // 验证查询日志被创建
    expect(prisma.queryLog.create).toHaveBeenCalled();
    expect(prisma.queryLog.update).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    // 模拟错误
    (queryOptimizer.optimizePriceQuery as jest.Mock).mockRejectedValue(new Error('Test error'));
    
    // 创建请求
    const request = new NextRequest('http://localhost:3000/api/prices/query', {
      method: 'POST',
      body: JSON.stringify({
        serviceType: 1,
      }),
    });
    
    // 调用API
    const response = await POST(request);
    const data = await response.json();
    
    // 验证结果
    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe('价格查询失败');
  });

  it('should work with anonymous users', async () => {
    // 模拟匿名会话
    (getServerSession as jest.Mock).mockResolvedValue(null);
    
    // 创建请求
    const request = new NextRequest('http://localhost:3000/api/prices/query', {
      method: 'POST',
      body: JSON.stringify({
        serviceType: 1,
      }),
    });
    
    // 调用API
    const response = await POST(request);
    const data = await response.json();
    
    // 验证结果
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    
    // 验证查询日志使用了匿名用户类型
    expect(prisma.queryLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userType: 3, // 匿名用户
          userId: null,
        }),
      })
    );
  });
});
