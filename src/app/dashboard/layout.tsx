"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Layout, Menu, Button, Dropdown, Avatar, theme, ConfigProvider } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  DashboardOutlined,
  ShoppingOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  BarChartOutlined,
  FileOutlined,
  HomeOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import type { MenuProps } from "antd";

const { Header, Sider, Content } = Layout;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { bodyBg, borderRadiusLG },
  } = theme.useToken();

  // 使用 useEffect 处理重定向
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // 如果正在加载会话或未登录，显示加载状态
  if (status === "loading" || status === "unauthenticated") {
    return <div>加载中...</div>;
  }

  // 确保 session 存在
  if (!session) {
    return <div>无法获取用户会话信息</div>;
  }

  // 检查权限
  const checkPermission = (permission: string) => {
    if (!session || !session.user) return false;
    return session.user.permissions.includes(permission) || session.user.permissions.includes("admin");
  };

  // 构建菜单项
  const items: MenuProps["items"] = [
    {
      key: "dashboard",
      icon: <DashboardOutlined />,
      label: <Link href="/dashboard">仪表盘</Link>,
    },
    {
      key: "price",
      icon: <ShoppingOutlined />,
      label: "价格管理",
      children: [
        {
          key: "price-list",
          label: <Link href="/dashboard/prices">价格列表</Link>,
        },
        {
          key: "price-create",
          label: <Link href="/dashboard/prices/create">添加价格</Link>,
        },
        {
          key: "price-import",
          label: <Link href="/dashboard/prices/import">价格导入</Link>,
        },
        {
          key: "price-trend",
          label: <Link href="/dashboard/prices/trend">价格趋势</Link>,
        },
      ],
    },
    {
      key: "user",
      icon: <TeamOutlined />,
      label: "用户管理",
      children: [
        {
          key: "user-list",
          label: <Link href="/dashboard/users">用户列表</Link>,
        },
        {
          key: "role-manage",
          label: <Link href="/dashboard/roles">角色管理</Link>,
        },
        {
          key: "org-manage",
          label: <Link href="/dashboard/organizations">组织管理</Link>,
        },
      ],
    },
    {
      key: "reports",
      icon: <BarChartOutlined />,
      label: "报表分析",
      children: [
        {
          key: "query-stats",
          label: <Link href="/dashboard/reports/query-stats">查询统计</Link>,
        },
        {
          key: "price-analysis",
          label: <Link href="/dashboard/reports/price-analysis">价格分析</Link>,
        },
      ],
    },
    // 服务管理菜单，只有拥有相应权限的用户才能看到
    checkPermission("service-type:view") || checkPermission("service:view") ? {
      key: "service",
      icon: <AppstoreOutlined />,
      label: "服务管理",
      children: [
        checkPermission("service-type:view") ? {
          key: "service-types",
          label: <Link href="/dashboard/services/types">服务类型管理</Link>,
        } : null,
        checkPermission("service:view") ? {
          key: "services",
          label: <Link href="/dashboard/services">服务管理</Link>,
        } : null
      ].filter(Boolean),
    } : null,
    {
      key: "system",
      icon: <SettingOutlined />,
      label: "系统管理",
      children: [
        {
          key: "system-settings",
          label: <Link href="/dashboard/settings">系统设置</Link>,
        },
        {
          key: "system-announcements",
          label: <Link href="/dashboard/settings/announcements">公告管理</Link>,
        },
        {
          key: "system-log",
          label: <Link href="/dashboard/logs">操作日志</Link>,
        },
      ],
    },
  ];

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "个人信息",
      onClick: () => router.push('/dashboard/profile'),
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: () => signOut({ callbackUrl: "/login" }),
    },
  ];

  // 自定义主题配置
  const customTheme = {
    components: {
      Menu: {
        // 使用新的主题令牌名称
        itemBg: '#ffffff',
        itemColor: 'rgba(0, 0, 0, 0.88)',
        itemHoverColor: '#1677ff',
        itemSelectedColor: '#1677ff',
        itemSelectedBg: '#e6f4ff',
        // 触发器相关
        triggerBg: '#fff',
        // 布局相关
        bodyBg: '#ffffff',
        headerBg: '#ffffff',
      },
    },
  };

  return (
    <ConfigProvider theme={customTheme}>
      <Layout style={{ minHeight: "100vh" }}>
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          theme="light"
          style={{
            overflow: "auto",
            height: "100vh",
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
          }}
        >
          <div className="p-4 text-center">
            <h1 className="text-lg font-bold">
              {collapsed ? "PGS" : "物流查价系统"}
            </h1>
          </div>
          <Menu
            theme="light"
            mode="inline"
            defaultSelectedKeys={["dashboard"]}
            items={items || []}
            className="dashboard-menu"
          />
        </Sider>
        <Layout style={{ marginLeft: collapsed ? 80 : 200 }}>
          <Header
            style={{
              padding: 0,
              background: bodyBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: "16px", width: 64, height: 64 }}
            />
            <div className="mr-4 flex items-center">
              <Button
                type="link"
                icon={<HomeOutlined />}
                onClick={() => router.push('/')}
                className="mr-4"
              >
                返回首页
              </Button>
              <Dropdown menu={{ items: userMenuItems || [] }} placement="bottomRight">
                <div className="flex items-center cursor-pointer">
                  <Avatar icon={<UserOutlined />} />
                  <span className="ml-2">{session?.user?.name || '用户'}</span>
                </div>
              </Dropdown>
            </div>
          </Header>
          <Content
            style={{
              margin: "24px 16px",
              padding: 24,
              minHeight: 280,
              background: bodyBg,
              borderRadius: borderRadiusLG,
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
