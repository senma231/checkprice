"use client";

import { useState, useEffect } from "react";
import {
  Table,
  Button,
  Card,
  Space,
  Typography,
  message,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Tag,
  App
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("创建公告");
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [form] = Form.useForm();
  const { modal } = App.useApp();

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

  // 保存公告数据到 localStorage
  const saveAnnouncementsToStorage = (data) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('announcements', JSON.stringify(data));
      } catch (error) {
        console.error('保存公告数据到本地存储失败:', error);
      }
    }
  };

  // 设置默认公告数据
  const setDefaultAnnouncementData = () => {
    // 先尝试从 localStorage 读取
    const storedAnnouncements = getAnnouncementsFromStorage();

    if (storedAnnouncements && storedAnnouncements.length > 0) {
      // 使用存储的数据
      setAnnouncements(storedAnnouncements);
      setPagination({
        ...pagination,
        current: 1,
        total: storedAnnouncements.length
      });
    } else {
      // 使用默认数据
      const defaultAnnouncements = [
        {
          id: 1,
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
        }
      ];

      setAnnouncements(defaultAnnouncements);
      setPagination({
        ...pagination,
        current: 1,
        total: 1
      });

      // 保存到 localStorage
      saveAnnouncementsToStorage(defaultAnnouncements);
    }
  };

  // 获取公告列表
  const fetchAnnouncements = async (params = {}) => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/announcements', {
        params: {
          ...params,
          page: params.current || pagination.current,
          pageSize: params.pageSize || pagination.pageSize
        }
      });

      if (data.success) {
        setAnnouncements(data.data.announcements);
        setPagination({
          ...pagination,
          current: data.data.pagination.current,
          total: data.data.pagination.total
        });

        // 如果成功从API获取数据，清除localStorage中的数据
        if (typeof window !== 'undefined' && data.data.announcements.length > 0) {
          localStorage.removeItem('announcements');
        }
      } else {
        console.warn(data.message || "获取公告列表失败");
        // 设置默认公告数据
        setDefaultAnnouncementData();
      }
    } catch (error) {
      console.error("获取公告列表错误:", error);
      // 设置默认公告数据
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

  // 表格变化处理
  const handleTableChange = (pagination) => {
    fetchAnnouncements({ current: pagination.current });
  };

  // 打开创建公告模态框
  const handleCreate = () => {
    setModalTitle("创建公告");
    setEditingAnnouncement(null);
    form.resetFields();
    form.setFieldsValue({
      status: 1,
      publishTime: dayjs()
    });
    setModalVisible(true);
  };

  // 打开编辑公告模态框
  const handleEdit = (record) => {
    setModalTitle("编辑公告");
    setEditingAnnouncement(record);
    form.setFieldsValue({
      ...record,
      publishTime: record.publishTime ? dayjs(record.publishTime) : null,
      expireTime: record.expireTime ? dayjs(record.expireTime) : null
    });
    setModalVisible(true);
  };

  // 删除公告确认
  const handleDelete = async (id) => {
    try {
      try {
        const { data } = await axios.delete(`/api/announcements/${id}`);

        if (data.success) {
          message.success("公告删除成功");
          fetchAnnouncements();
        } else {
          throw new Error(data.message || "公告删除失败");
        }
      } catch (apiError) {
        console.error("删除公告API错误:", apiError);

        // 模拟成功删除
        message.success("公告删除成功（模拟）");

        // 从本地数据中移除
        const updatedAnnouncements = announcements.filter(item => item.id !== id);
        setAnnouncements(updatedAnnouncements);

        // 更新分页信息
        if (pagination.total > 0) {
          setPagination({
            ...pagination,
            total: pagination.total - 1
          });
        }

        // 保存到 localStorage
        saveAnnouncementsToStorage(updatedAnnouncements);
      }
    } catch (error) {
      console.error("删除公告错误:", error);
      message.error("公告删除失败");
    }
  };

  // 删除公告前确认
  const showDeleteConfirm = (record) => {
    modal.confirm({
      title: '确定要删除这条公告吗?',
      icon: <ExclamationCircleOutlined />,
      content: '删除后将无法恢复',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        handleDelete(record.id);
      }
    });
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const formData = {
        ...values,
        publishTime: values.publishTime.toISOString(),
        expireTime: values.expireTime ? values.expireTime.toISOString() : null
      };

      try {
        let response;
        let apiSuccess = false;

        if (editingAnnouncement) {
          // 更新公告
          try {
            response = await axios.put(`/api/announcements/${editingAnnouncement.id}`, formData);
            if (response.data.success) {
              message.success("公告更新成功");
              apiSuccess = true;
            } else {
              console.warn("公告更新API返回失败:", response.data.message);
            }
          } catch (error) {
            console.error("公告更新API错误:", error);
          }

          // 无论API是否成功，都关闭模态框
          setModalVisible(false);

          if (apiSuccess) {
            // 如果API成功，刷新数据
            fetchAnnouncements();
          } else {
            // 如果API失败，使用本地更新
            message.success("公告更新成功（本地模式）");
          }
        } else {
          // 创建公告
          try {
            response = await axios.post('/api/announcements', formData);
            if (response.data.success) {
              message.success("公告创建成功");
              apiSuccess = true;
            } else {
              console.warn("公告创建API返回失败:", response.data.message);
            }
          } catch (error) {
            console.error("公告创建API错误:", error);
          }

          // 无论API是否成功，都关闭模态框
          setModalVisible(false);

          if (apiSuccess) {
            // 如果API成功，刷新数据
            fetchAnnouncements();
          } else {
            // 如果API失败，使用本地更新
            message.success("公告创建成功（本地模式）");
          }
        }

        // 如果API失败，使用本地更新
        if (!apiSuccess) {
          if (editingAnnouncement) {
            // 更新本地数据
            const updatedAnnouncements = announcements.map(item =>
              item.id === editingAnnouncement.id
                ? {
                    ...item,
                    ...formData,
                    publishTime: new Date(formData.publishTime),
                    expireTime: formData.expireTime ? new Date(formData.expireTime) : null,
                    updatedAt: new Date()
                  }
                : item
            );
            setAnnouncements(updatedAnnouncements);

            // 保存到 localStorage
            saveAnnouncementsToStorage(updatedAnnouncements);
          } else {
            // 创建新公告并添加到列表
            const newAnnouncement = {
              id: Date.now(), // 使用时间戳作为临时ID
              ...formData,
              publishTime: new Date(formData.publishTime),
              expireTime: formData.expireTime ? new Date(formData.expireTime) : null,
              status: formData.status || 1,
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 1,
              creator: {
                id: 1,
                username: "admin",
                realName: "系统管理员"
              }
            };

            setAnnouncements([newAnnouncement, ...announcements]);
            setPagination({
              ...pagination,
              total: pagination.total + 1
            });

            // 保存到 localStorage
            saveAnnouncementsToStorage([newAnnouncement, ...announcements]);
          }
        }
      } catch (apiError) {
        console.error(`${editingAnnouncement ? '更新' : '创建'}公告API错误:`, apiError);
        message.error(`公告${editingAnnouncement ? '更新' : '创建'}失败`);
        setModalVisible(false);
      }
    } catch (formError) {
      console.error("表单验证错误:", formError);
      message.error("请检查表单填写是否正确");
    } finally {
      setLoading(false);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 60
    },
    {
      title: "标题",
      dataIndex: "title",
      key: "title",
      ellipsis: true
    },
    {
      title: "发布时间",
      dataIndex: "publishTime",
      key: "publishTime",
      render: (text) => text ? new Date(text).toLocaleString() : "-"
    },
    {
      title: "过期时间",
      dataIndex: "expireTime",
      key: "expireTime",
      render: (text) => text ? new Date(text).toLocaleString() : "永不过期"
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === 1 ? "success" : "default"}>
          {status === 1 ? "有效" : "无效"}
        </Tag>
      )
    },
    {
      title: "创建人",
      dataIndex: "creator",
      key: "creator",
      render: (creator) => creator?.realName || creator?.username || "-"
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (text) => text ? new Date(text).toLocaleString() : "-"
    },
    {
      title: "操作",
      key: "action",
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => showDeleteConfirm(record)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Title level={2}>公告管理</Title>
        <Space>
          <Button
            onClick={() => {
              // 从 localStorage 获取公告数据
              const storedAnnouncements = getAnnouncementsFromStorage();
              if (storedAnnouncements && storedAnnouncements.length > 0) {
                modal.confirm({
                  title: '同步本地公告数据到数据库',
                  content: `检测到本地存储中有 ${storedAnnouncements.length} 条公告数据，是否同步到数据库？`,
                  okText: '同步',
                  cancelText: '取消',
                  onOk: async () => {
                    setLoading(true);
                    try {
                      // 逐条同步公告数据
                      let successCount = 0;
                      let failCount = 0;

                      for (const announcement of storedAnnouncements) {
                        try {
                          // 准备数据
                          const formData = {
                            title: announcement.title,
                            content: announcement.content,
                            publishTime: new Date(announcement.publishTime).toISOString(),
                            expireTime: announcement.expireTime ? new Date(announcement.expireTime).toISOString() : null,
                            status: announcement.status || 1
                          };

                          // 发送请求
                          await axios.post('/api/announcements', formData);
                          successCount++;
                        } catch (error) {
                          console.error('同步公告数据失败:', error);
                          failCount++;
                        }
                      }

                      // 同步完成后清除本地存储
                      if (successCount > 0) {
                        localStorage.removeItem('announcements');
                        message.success(`成功同步 ${successCount} 条公告数据到数据库`);
                        // 重新获取公告列表
                        fetchAnnouncements();
                      }

                      if (failCount > 0) {
                        message.warning(`有 ${failCount} 条公告数据同步失败，请检查控制台错误信息`);
                      }
                    } catch (error) {
                      console.error('同步公告数据过程中出错:', error);
                      message.error('同步公告数据失败');
                    } finally {
                      setLoading(false);
                    }
                  }
                });
              } else {
                message.info('本地存储中没有公告数据需要同步');
              }
            }}
          >
            同步本地数据
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            创建公告
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={announcements}
          rowKey="id"
          pagination={pagination}
          loading={loading}
          onChange={handleTableChange}
          expandable={{
            expandedRowRender: (record) => (
              <div className="p-4">
                <div className="mb-2"><strong>公告内容:</strong></div>
                <div className="whitespace-pre-wrap">{record.content}</div>
              </div>
            )
          }}
        />
      </Card>

      <Modal
        title={modalTitle}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={loading}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="title"
            label="公告标题"
            rules={[{ required: true, message: "请输入公告标题" }]}
          >
            <Input placeholder="输入公告标题" />
          </Form.Item>

          <Form.Item
            name="content"
            label="公告内容"
            rules={[{ required: true, message: "请输入公告内容" }]}
          >
            <TextArea rows={6} placeholder="输入公告内容" />
          </Form.Item>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="publishTime"
              label="发布时间"
              rules={[{ required: true, message: "请选择发布时间" }]}
            >
              <DatePicker
                showTime
                format="YYYY-MM-DD HH:mm:ss"
                style={{ width: '100%' }}
                placeholder="选择发布时间"
              />
            </Form.Item>

            <Form.Item
              name="expireTime"
              label="过期时间"
            >
              <DatePicker
                showTime
                format="YYYY-MM-DD HH:mm:ss"
                style={{ width: '100%' }}
                placeholder="选择过期时间（可选）"
              />
            </Form.Item>
          </div>

          <Form.Item
            name="status"
            label="状态"
            initialValue={1}
          >
            <Select placeholder="选择状态">
              <Option value={1}>有效</Option>
              <Option value={0}>无效</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
