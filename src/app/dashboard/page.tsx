"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Typography, Card, Row, Col, Statistic, List, Tag, Empty, Pagination, App } from "antd";
import {
  ShoppingCartOutlined,
  UserOutlined,
  DollarOutlined,
  FileOutlined,
  NotificationOutlined,
  LeftOutlined,
  RightOutlined
} from "@ant-design/icons";
import axios from "axios";

const { Title, Paragraph } = Typography;

export default function DashboardPage() {
  const { data: session } = useSession();
  const { message } = App.useApp();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const announcementsPerPage = 2; // 每页显示2条公告

  // 从 localStorage 读取公告数据
  const getAnnouncementsFromStorage = () => {
    if (typeof window !== 'undefined') {
      try {
        const storedData = localStorage.getItem('announcements');
        if (storedData) {
          return JSON.parse(storedData);
        }
      } catch (error) {
        console.error('读取本地存储公告数据失败:', error);
      }
    }
    return null;
  };

  // 设置默认公告数据
  const setDefaultAnnouncementData = () => {
    // 先尝试从 localStorage 读取
    const storedAnnouncements = getAnnouncementsFromStorage();

    if (storedAnnouncements && storedAnnouncements.length > 0) {
      // 使用存储的数据，但只显示有效的公告
      const validAnnouncements = storedAnnouncements.filter(item => {
        const now = new Date();
        const publishTime = new Date(item.publishTime);
        const expireTime = item.expireTime ? new Date(item.expireTime) : null;

        return (
          item.status === 1 &&
          publishTime <= now &&
          (!expireTime || expireTime >= now)
        );
      });

      // 按发布时间排序，最新的在前面
      validAnnouncements.sort((a, b) =>
        new Date(b.publishTime).getTime() - new Date(a.publishTime).getTime()
      );

      // 只取前5条
      setAnnouncements(validAnnouncements.slice(0, 5));
    } else {
      // 使用默认数据
      setAnnouncements([{
        id: 0,
        title: "欢迎使用物流查价系统",
        content: "系统目前处于开发阶段，如有问题请联系管理员。",
        publishTime: new Date(),
        status: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 1,
        creator: {
          id: 1,
          username: "admin",
          realName: "系统管理员"
        }
      }]);
    }
  };

  // 获取公告列表
  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/announcements', {
        params: { dashboard: true }
      });

      if (data.success) {
        setAnnouncements(data.data.announcements);

        // 如果成功从API获取数据，清除localStorage中的数据
        if (typeof window !== 'undefined' && data.data.announcements.length > 0) {
          localStorage.removeItem('announcements');
        }
      } else {
        console.warn(data.message || "获取公告列表失败");
        // 设置默认公告
        setDefaultAnnouncementData();
      }
    } catch (error) {
      console.error("获取公告列表错误:", error);
      // 设置默认公告
      setDefaultAnnouncementData();
    } finally {
      setLoading(false);
    }
  };

  // 首次加载
  useEffect(() => {
    // 先设置默认数据，以防 API 请求失败
    setDefaultAnnouncementData();
    // 然后尝试从 API 获取数据
    fetchAnnouncements();
  }, []);

  return (
    <div className="p-6">
      <Title level={2}>仪表盘</Title>
      <p className="mb-6">欢迎回来，{session?.user?.name || "用户"}！</p>

      <Row gutter={16} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总价格数"
              value={1234}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="物流服务"
              value={42}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="用户数"
              value={18}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="价格导入"
              value={56}
              prefix={<FileOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card title="最近活动" className="mb-6">
            <p>暂无活动记录</p>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title={
              <div className="flex items-center">
                <NotificationOutlined className="mr-2" />
                <span>系统公告</span>
              </div>
            }
            loading={loading}
          >
            {announcements.length > 0 ? (
              <>
                <List
                  itemLayout="vertical"
                  dataSource={announcements.slice(
                    (currentPage - 1) * announcementsPerPage,
                    currentPage * announcementsPerPage
                  )}
                  renderItem={(item) => (
                    <List.Item
                      key={item.id}
                      extra={
                        <div className="text-right">
                          <div>
                            <Tag color="blue">{new Date(item.publishTime).toLocaleDateString()}</Tag>
                          </div>
                          {item.expireTime && (
                            <div className="mt-1">
                              <Tag color="orange">到期: {new Date(item.expireTime).toLocaleDateString()}</Tag>
                            </div>
                          )}
                        </div>
                      }
                    >
                      <List.Item.Meta
                        title={<strong>{item.title}</strong>}
                        description={`发布人: ${item.creator?.realName || item.creator?.username || '系统'}`}
                      />
                      <Paragraph ellipsis={{ rows: 2 }}>{item.content}</Paragraph>
                    </List.Item>
                  )}
                />

                {announcements.length > announcementsPerPage && (
                  <div className="flex justify-center mt-4">
                    <div className="flex items-center">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className={`flex items-center justify-center w-8 h-8 rounded-full mr-2 ${
                          currentPage === 1
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-blue-500 hover:bg-blue-50'
                        }`}
                      >
                        <LeftOutlined />
                      </button>

                      <span className="mx-2 text-sm">
                        {currentPage} / {Math.ceil(announcements.length / announcementsPerPage)}
                      </span>

                      <button
                        onClick={() => setCurrentPage(prev =>
                          Math.min(prev + 1, Math.ceil(announcements.length / announcementsPerPage))
                        )}
                        disabled={currentPage >= Math.ceil(announcements.length / announcementsPerPage)}
                        className={`flex items-center justify-center w-8 h-8 rounded-full ml-2 ${
                          currentPage >= Math.ceil(announcements.length / announcementsPerPage)
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-blue-500 hover:bg-blue-50'
                        }`}
                      >
                        <RightOutlined />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Empty description="暂无公告" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
