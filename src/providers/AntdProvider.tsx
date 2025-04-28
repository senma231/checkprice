'use client';

// 导入 React 19 补丁
import '@ant-design/v5-patch-for-react-19';

import React from 'react';
import { ConfigProvider, App } from 'antd';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import zhCN from 'antd/lib/locale/zh_CN';
import themeConfig from '@/theme/themeConfig';

interface AntdProviderProps {
  children: React.ReactNode;
}

/**
 * Ant Design提供者
 * 用于配置Ant Design的主题和语言
 */
export function AntdProvider({ children }: AntdProviderProps) {
  return (
    <AntdRegistry>
      <ConfigProvider locale={zhCN} theme={themeConfig}>
        <App>
          {children}
        </App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
