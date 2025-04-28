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
  Tag,
  Row,
  Col
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  ReloadOutlined
} from "@ant-design/icons";
import axios from "axios";
import { useSession } from "next-auth/react";

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function ServicesPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [searchForm] = Form.useForm();
  const [modalForm] = Form.useForm();

  // 获取服务类型列表
  const fetchServiceTypes = async () => {
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
    }
  };

  // 获取服务列表
  const fetchServices = async (params = {}) => {
    setLoading(true);
    try {
      const { current, pageSize, ...filters } = params;
      const queryParams = new URLSearchParams({
        page: current || pagination.current,
        pageSize: pageSize || pagination.pageSize,
        ...filters
      });

      const { data } = await axios.get(`/api/data/services?${queryParams}`);
      if (data.success) {
        setServices(data.data);
        setPagination({
          ...pagination,
          current: data.pagination.current,
          pageSize: data.pagination.pageSize,
          total: data.pagination.total
        });
      } else {
        message.error(data.message || "获取服务失败");
      }
    } catch (error) {
      console.error("获取服务错误:", error);
      message.error("获取服务失败");
    } finally {
      setLoading(false);
    }
  };

  // 创建或更新服务
  const handleSubmit = async () => {
    try {
      const values = await modalForm.validateFields();
      setLoading(true);

      if (editingService) {
        // 更新服务
        const { data } = await axios.put(
          `/api/data/services/${editingService.id}`,
          values
        );
        if (data.success) {
          message.success("服务更新成功");
          setModalVisible(false);
          fetchServices();
        } else {
          message.error(data.message || "服务更新失败");
        }
      } else {
        // 创建服务
        const { data } = await axios.post("/api/data/services", values);
        if (data.success) {
          message.success("服务创建成功");
          setModalVisible(false);
          fetchServices();
        } else {
          message.error(data.message || "服务创建失败");
        }
      }
    } catch (error) {
      console.error("提交服务错误:", error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error("操作失败，请稍后重试");
      }
    } finally {
      setLoading(false);
    }
  };

  // 删除服务
  const handleDelete = async (id) => {
    try {
      const { data } = await axios.delete(`/api/data/services/${id}`);
      if (data.success) {
        message.success("删除成功");
        fetchServices();
      } else {
        message.error(data.message || "删除失败");
      }
    } catch (error) {
      console.error("删除服务错误:", error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error("删除失败，请稍后重试");
      }
    }
  };

  // 打开编辑/创建模态框
  const openModal = (service = null) => {
    setEditingService(service);
    modalForm.resetFields();

    if (service) {
      modalForm.setFieldsValue(service);
    }

    setModalVisible(true);
  };

  // 处理搜索
  const handleSearch = (values) => {
    fetchServices({
      current: 1,
      ...values
    });
  };

  // 处理重置
  const handleReset = () => {
    searchForm.resetFields();
    fetchServices({ current: 1 });
  };

  // 处理表格分页、排序、筛选变化
  const handleTableChange = (pagination, filters, sorter) => {
    fetchServices({
      current: pagination.current,
      pageSize: pagination.pageSize,
      ...searchForm.getFieldsValue()
    });
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
      title: "服务类型",
      dataIndex: "serviceType",
      key: "serviceType",
      render: (serviceType) => serviceType?.name || "-",
    },
    {
      title: "服务提供商",
      dataIndex: "provider",
      key: "provider",
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
          {checkPermission("service:edit") && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openModal(record)}
            />
          )}
          {checkPermission("service:delete") && (
            <Popconfirm
              title="确定要删除此服务吗？"
              description="删除后无法恢复，且会影响关联的价格"
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
    fetchServices();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Title level={2}>服务管理</Title>
        {checkPermission("service:create") && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openModal()}
          >
            添加服务
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <Form
          form={searchForm}
          onFinish={handleSearch}
          layout="vertical"
        >
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="keyword" label="关键词">
                <Input placeholder="输入名称或编码搜索" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="serviceTypeId" label="服务类型">
                <Select placeholder="选择服务类型" allowClear>
                  {serviceTypes.map(type => (
                    <Option key={type.id} value={type.id}>{type.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="status" label="状态">
                <Select placeholder="选择状态" allowClear>
                  <Option value="1">启用</Option>
                  <Option value="0">禁用</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item label=" " colon={false}>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                    搜索
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={handleReset}>
                    重置
                  </Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={services}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
        />
      </Card>

      <Modal
        title={editingService ? "编辑服务" : "添加服务"}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={loading}
      >
        <Form form={modalForm} layout="vertical">
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: "请输入服务名称" }]}
          >
            <Input placeholder="输入服务名称" />
          </Form.Item>

          <Form.Item
            name="code"
            label="编码"
            rules={[{ required: true, message: "请输入服务编码" }]}
          >
            <Input placeholder="输入服务编码" />
          </Form.Item>

          <Form.Item
            name="serviceTypeId"
            label="服务类型"
            rules={[{ required: true, message: "请选择服务类型" }]}
          >
            <Select placeholder="选择服务类型">
              {serviceTypes.map((type) => (
                <Option key={type.id} value={type.id}>
                  {type.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="provider"
            label="服务提供商"
          >
            <Input placeholder="输入服务提供商" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <TextArea rows={4} placeholder="输入服务描述" />
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
