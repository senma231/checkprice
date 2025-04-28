import { PrismaClient } from '@prisma/client';
import QueryOptimizer from './query-optimizer';

// PrismaClient是一个重量级对象，不应该在每次请求时都创建一个新实例
// 在开发环境中，Next.js的热重载会导致创建多个实例
// 这里我们确保只创建一个PrismaClient实例

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
  queryOptimizer: QueryOptimizer;
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// 创建查询优化器实例
export const queryOptimizer =
  globalForPrisma.queryOptimizer ||
  new QueryOptimizer(prisma);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.queryOptimizer = queryOptimizer;
}
