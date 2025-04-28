"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Layout, Typography, Button, Form, Input, Select, Card, Row, Col, Dropdown, Avatar, Space } from "antd";
import { SearchOutlined, LoginOutlined, UserOutlined, LogoutOutlined, SettingOutlined, DashboardOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

const { Header, Content, Footer } = Layout;
const { Title, Paragraph } = Typography;
const { Option } = Select;

export default function Home() {
  const router = useRouter();
  const [form] = Form.useForm();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);

  const onFinish = (values: any) => {
    console.log("查询参数:", values);
    // 这里可以实现匿名查询功能
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut({ redirect: false });
      router.push("/login");
    } catch (error) {
      console.error("登出错误:", error);
    } finally {
      setLoading(false);
    }
  };

  const userMenuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '控制面板',
      onClick: () => router.push('/dashboard')
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '个人设置',
      onClick: () => router.push('/dashboard/profile')
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    },
  ];

  return (
    <Layout className="min-h-screen">
      <Header className="flex items-center justify-between bg-white shadow-sm" style={{ padding: '0 20px', position: 'relative', zIndex: 10 }}>
        <div className="flex items-center">
          <div className="text-xl font-bold">物流查价系统</div>
        </div>
        <div>
          {status === "authenticated" && session ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space className="cursor-pointer">
                <Avatar
                  style={{ backgroundColor: '#1677ff' }}
                  icon={<UserOutlined />}
                />
                <span className="hidden md:inline">{session.user.name || session.user.username}</span>
              </Space>
            </Dropdown>
          ) : (
            <Button
              type="primary"
              icon={<LoginOutlined />}
              onClick={() => router.push("/login")}
              style={{ height: '32px', lineHeight: '32px', marginRight: '0' }}
              className="login-button"
              loading={status === "loading"}
            >
              登录
            </Button>
          )}
        </div>
      </Header>

      <Content className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 mt-8">
            <Title>物流查价系统</Title>
            <Paragraph className="text-lg">
              提供便捷的物流价格查询服务，支持传统物流、FBA头程物流以及增值服务
            </Paragraph>
          </div>

          <Card className="mb-16 shadow-md">
            <Title level={3} className="mb-6">快速查询</Title>
            <Form
              form={form}
              name="price_query"
              onFinish={onFinish}
              layout="vertical"
            >
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="serviceType"
                    label="服务类型"
                    rules={[{ required: true, message: "请选择服务类型" }]}
                  >
                    <Select placeholder="选择服务类型">
                      <Option value="traditional">传统物流</Option>
                      <Option value="fba">FBA头程物流</Option>
                      <Option value="valueAdded">增值服务</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="originRegion"
                    label="始发地"
                    rules={[{ required: true, message: "请选择始发地" }]}
                  >
                    <Select placeholder="选择始发地">
                      <Option value="cn">中国</Option>
                      <Option value="us">美国</Option>
                      <Option value="uk">英国</Option>
                      <Option value="de">德国</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="destinationRegion"
                    label="目的地"
                    rules={[{ required: true, message: "请选择目的地" }]}
                  >
                    <Select placeholder="选择目的地">
                      <Option value="cn">中国</Option>
                      <Option value="us">美国</Option>
                      <Option value="uk">英国</Option>
                      <Option value="de">德国</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="weight"
                    label="重量(kg)"
                  >
                    <Input type="number" min={0} placeholder="输入重量" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="volume"
                    label="体积(m³)"
                  >
                    <Input type="number" min={0} placeholder="输入体积" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8} className="flex items-end">
                  <Form.Item className="w-full">
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SearchOutlined />}
                      className="w-full search-button"
                      style={{ height: '38px', margin: '0 auto' }}
                    >
                      查询价格
                    </Button>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>

          <Row gutter={24} className="mb-12 mt-8">
            <Col xs={24} md={8} className="mb-4">
              <Card title="传统物流" className="h-full shadow-sm hover:shadow-md transition-shadow">
                <p>提供海运、空运、陆运等传统物流服务的价格查询</p>
                <Button type="link" className="p-0">了解更多</Button>
              </Card>
            </Col>
            <Col xs={24} md={8} className="mb-4">
              <Card title="FBA头程物流" className="h-full shadow-sm hover:shadow-md transition-shadow">
                <p>提供亚马逊FBA头程物流服务的价格查询，包括海运、空运和快递头程</p>
                <Button type="link" className="p-0">了解更多</Button>
              </Card>
            </Col>
            <Col xs={24} md={8} className="mb-4">
              <Card title="增值服务" className="h-full shadow-sm hover:shadow-md transition-shadow">
                <p>提供海外仓、贴换标、包装等增值服务的价格查询</p>
                <Button type="link" className="p-0">了解更多</Button>
              </Card>
            </Col>
          </Row>
        </div>
      </Content>

      <Footer className="text-center">
        PGS物流查价系统 ©{new Date().getFullYear()} 版权所有
      </Footer>
    </Layout>
  );
}
