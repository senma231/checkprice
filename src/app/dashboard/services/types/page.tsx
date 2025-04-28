"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Modal,
  Form,
  Input,
  Select,
  Typography,
  Tag
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined
} from "@ant-design/icons";
import axios from "axios";
import { useSession } from "next-auth/react";

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function ServiceTypesPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingServiceType, setEditingServiceType] = useState(null);
  const [form] = Form.useForm();

  // 获取服务类型列表
  const fetchServiceTypes = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/data/service-types");
      if (data.success) {
        setServiceTypes(data.data);
      } else {
        message.error(data.message || "获取服务类型失败");
      }
    } catch (error) {
      console.error("获取服务类型错误:", error);
      message.error("获取服务类型失败");
    } finally {
      setLoading(false);
    }
  };

  // 创建或更新服务类型
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (editingServiceType) {
        // 更新服务类型
        const { data } = await axios.put(
          `/api/data/service-types/${editingServiceType.id}`,
          values
        );
        if (data.success) {
          message.success("服务类型更新成功");
          setModalVisible(false);
          fetchServiceTypes();
        } else {
          message.error(data.message || "服务类型更新失败");
        }
      } else {
        // 创建服务类型
        const { data } = await axios.post("/api/data/service-types", values);
        if (data.success) {
          message.success("服务类型创建成功");
          setModalVisible(false);
          fetchServiceTypes();
        } else {
          message.error(data.message || "服务类型创建失败");
        }
      }
    } catch (error) {
      console.error("提交服务类型错误:", error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error("操作失败，请稍后重试");
      }
    } finally {
      setLoading(false);
    }
  };

  // 删除服务类型
  const handleDelete = async (id) => {
    try {
      const { data } = await axios.delete(`/api/data/service-types/${id}`);
      if (data.success) {
        message.success("删除成功");
        fetchServiceTypes();
      } else {
        message.error(data.message || "删除失败");
      }
    } catch (error) {
      console.error("删除服务类型错误:", error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error("删除失败，请稍后重试");
      }
    }
  };

  // 打开编辑/创建模态框
  const openModal = (serviceType = null) => {
    setEditingServiceType(serviceType);
    form.resetFields();

    if (serviceType) {
      form.setFieldsValue(serviceType);
    }

    setModalVisible(true);
  };

  // 表格列定义
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 60,
    },
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "编码",
      dataIndex: "code",
      key: "code",
    },
    {
      title: "父级类型",
      dataIndex: "parent",
      key: "parent",
      render: (parent) => parent?.name || "-",
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === 1 ? "green" : "red"}>
          {status === 1 ? "启用" : "禁用"}
        </Tag>
      ),
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Space size="small">
          {checkPermission("service-type:edit") && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openModal(record)}
            />
          )}
          {checkPermission("service-type:delete") && (
            <Popconfirm
              title="确定要删除此服务类型吗？"
              description="删除后无法恢复，且会影响关联的服务"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
              icon={<ExclamationCircleOutlined style={{ color: "red" }} />}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // 检查权限
  const checkPermission = (permission: string) => {
    if (!session || !session.user) return false;
    return session.user.permissions.includes(permission) || session.user.permissions.includes("admin");
  };

  // 首次加载
  useEffect(() => {
    fetchServiceTypes();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Title level={2}>服务类型管理</Title>
        {checkPermission("service-type:create") && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openModal()}
          >
            添加服务类型
          </Button>
        )}
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={serviceTypes}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingServiceType ? "编辑服务类型" : "添加服务类型"}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: "请输入服务类型名称" }]}
          >
            <Input placeholder="输入服务类型名称" />
          </Form.Item>

          <Form.Item
            name="code"
            label="编码"
            rules={[{ required: true, message: "请输入服务类型编码" }]}
          >
            <Input placeholder="输入服务类型编码" />
          </Form.Item>

          <Form.Item name="parentId" label="父级类型">
            <Select placeholder="选择父级类型" allowClear>
              {serviceTypes.map((type) => (
                <Option
                  key={type.id}
                  value={type.id}
                  disabled={editingServiceType && editingServiceType.id === type.id}
                >
                  {type.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="description" label="描述">
            <TextArea rows={4} placeholder="输入服务类型描述" />
          </Form.Item>

          <Form.Item name="status" label="状态" initialValue={1}>
            <Select placeholder="选择状态">
              <Option value={1}>启用</Option>
              <Option value={0}>禁用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
