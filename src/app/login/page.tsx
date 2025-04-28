"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Card, Typography, App } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";

const { Title } = Typography;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp(); // 使用 App.useApp() 钩子获取 message 实例

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        username: values.username,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        message.error("用户名或密码错误");
      } else {
        message.success("登录成功");
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("登录错误:", error);
      message.error("登录失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100" style={{ zIndex: 1 }}>
      <Card className="w-full max-w-md shadow-lg" style={{ position: 'relative', zIndex: 2 }}>
        <div className="text-center mb-6">
          <Title level={2}>物流查价系统</Title>
          <p className="text-gray-500">登录您的账户</p>
        </div>
        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              placeholder="用户名"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="密码"
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full"
              loading={loading}
              style={{ position: 'relative', zIndex: 10 }}
            >
              登录
            </Button>
          </Form.Item>
          <div className="text-center mt-4">
            <p className="text-gray-500 text-sm">提示: 使用 admin / admin123 登录</p>
          </div>
        </Form>
      </Card>
    </div>
  );
}
