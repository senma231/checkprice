import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/lib/locale/zh_CN';

// 创建自定义渲染函数
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => {
  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    // 模拟会话数据
    const mockSession = {
      user: {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        userType: 1,
        permissions: ['price:view', 'price:create', 'price:edit', 'price:delete', 'report:view'],
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    return (
      <SessionProvider session={mockSession}>
        <ConfigProvider locale={zhCN}>
          {children}
        </ConfigProvider>
      </SessionProvider>
    );
  };

  return render(ui, { wrapper: AllTheProviders, ...options });
};

// 重新导出testing-library的所有内容
export * from '@testing-library/react';
export { customRender as render };
