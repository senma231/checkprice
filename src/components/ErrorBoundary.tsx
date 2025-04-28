"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Result, Typography, Card } from 'antd';
import { ReloadOutlined, BugOutlined, HomeOutlined } from "@ant-design/icons";

const { Paragraph, Text } = Typography;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 错误边界组件
 * 用于捕获子组件中的JavaScript错误，并显示备用UI
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新状态，下次渲染时显示备用UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 记录错误信息
    console.error('Error caught by ErrorBoundary:', error, errorInfo);

    // 更新错误信息
    this.setState({
      error,
      errorInfo
    });

    // 在实际应用中，可以将错误信息发送到服务器
    // logErrorToServer(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = (): void => {
    // 重新加载页面
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // 如果提供了自定义的fallback，则使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认的错误UI
      return (
        <Card className="m-4">
          <Result
            status="error"
            title="页面出错了"
            subTitle="抱歉，页面发生了错误，请尝试刷新页面或联系管理员。"
            extra={[
              <Button
                key="reload"
                type="primary"
                icon={<ReloadOutlined />}
                onClick={this.handleReload}
              >
                刷新页面
              </Button>,
              <Button
                key="reset"
                onClick={this.handleReset}
                icon={<BugOutlined />}
              >
                重试
              </Button>,
              <Button
                key="home"
                href="/"
                icon={<HomeOutlined />}
              >
                返回首页
              </Button>
            ]}
          >
            {this.state.error && (
              <div className="mt-4">
                <Paragraph>
                  <Text strong style={{ fontSize: 16 }}>
                    <BugOutlined /> 错误详情:
                  </Text>
                </Paragraph>
                <Card className="bg-gray-50">
                  <Paragraph copyable className="whitespace-pre-wrap">
                    {this.state.error.toString()}
                  </Paragraph>
                  {this.state.errorInfo && (
                    <Paragraph className="whitespace-pre-wrap text-xs mt-2 text-gray-500">
                      {this.state.errorInfo.componentStack}
                    </Paragraph>
                  )}
                </Card>
              </div>
            )}
          </Result>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
