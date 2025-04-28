"use client";

import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface PageLoadingProps {
  tip?: string;
  size?: 'small' | 'default' | 'large';
  delay?: number;
  fullScreen?: boolean;
}

/**
 * 页面加载组件
 * 用于显示页面加载状态
 */
const PageLoading: React.FC<PageLoadingProps> = ({
  tip = '加载中...',
  size = 'large',
  delay = 0,
  fullScreen = false
}) => {
  const antIcon = <LoadingOutlined style={{ fontSize: size === 'small' ? 24 : size === 'large' ? 40 : 32 }} spin />;

  const content = (
    <Spin
      indicator={antIcon}
      tip={tip}
      size={size}
      delay={delay}
    />
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      {content}
    </div>
  );
};

export default PageLoading;
