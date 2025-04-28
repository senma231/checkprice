'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { notification } from 'antd';
import { NotificationInstance } from 'antd/es/notification/interface';

// 通知上下文类型
interface NotificationContextType {
  api: NotificationInstance | null;
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
  warning: (message: string, description?: string) => void;
}

// 创建上下文
const NotificationContext = createContext<NotificationContextType>({
  api: null,
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
});

// 通知提供者属性
interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * 全局通知提供者
 * 用于在应用中提供统一的通知功能
 */
export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [api, contextHolder] = notification.useNotification();
  const [notificationApi] = useState<NotificationInstance>(api);
  
  // 成功通知
  const success = (message: string, description?: string) => {
    notificationApi.success({
      message,
      description,
      placement: 'topRight',
    });
  };
  
  // 错误通知
  const error = (message: string, description?: string) => {
    notificationApi.error({
      message,
      description,
      placement: 'topRight',
      duration: 0,
    });
  };
  
  // 信息通知
  const info = (message: string, description?: string) => {
    notificationApi.info({
      message,
      description,
      placement: 'topRight',
    });
  };
  
  // 警告通知
  const warning = (message: string, description?: string) => {
    notificationApi.warning({
      message,
      description,
      placement: 'topRight',
    });
  };
  
  return (
    <NotificationContext.Provider
      value={{
        api: notificationApi,
        success,
        error,
        info,
        warning,
      }}
    >
      {contextHolder}
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * 使用通知的Hook
 * 用于在组件中获取通知功能
 */
export const useNotification = () => useContext(NotificationContext);
