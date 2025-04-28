"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Table,
  Typography,
  Space,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Tabs,
  Select
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  ReloadOutlined
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useSession } from "next-auth/react";

const { Title } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Option } = Select;

interface ConfigData {
  id: number;
  configKey: string;
  configValue: string;
  description: string | null;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export default function SystemConfigPage() {
  const { data: session } = useSession();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ConfigData[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ConfigData | null>(null);
  const [activeTab, setActiveTab] = useState<string>("system");





  const columns: ColumnsType<ConfigData> = [
    {
      title: "配置键",
      dataIndex: "configKey",
      key: "configKey",
    },
    {
      title: "配置值",
      dataIndex: "configValue",
      key: "configValue",
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      key: "updatedAt",
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => {
        const canEdit = session?.user.permissions.includes("config:edit");

        return (
          <Space size="small">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              disabled={!canEdit}
            />
            {canEdit && (
              <Popconfirm
                title="确定要删除此配置吗？"
                onConfirm={() => handleDelete(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  // 加载数据
  const loadData = () => {
    setLoading(true);
    // 模拟API请求
    setTimeout(() => {
      if (activeTab === "system") {
        setData(mockSystemConfigs);
      } else {
        setData(mockBusinessConfigs);
      }
      setLoading(false);
    }, 500);
  };

  // 组件加载时获取数据
  useEffect(() => {
    loadData();
  }, [activeTab]);

  // 处理添加配置
  const handleAdd = () => {
    setEditingConfig(null);
    form.resetFields();

    // 设置默认值
    form.setFieldsValue({
      status: 1,
    });

    setIsModalVisible(true);
  };

  // 处理编辑配置
  const handleEdit = (record: ConfigData) => {
    setEditingConfig(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  // 处理删除配置
  const handleDelete = (id: number) => {
    setLoading(true);
    // 模拟API请求
    setTimeout(() => {
      setData(data.filter(item => item.id !== id));
      setLoading(false);
      message.success("配置删除成功");
    }, 500);
  };

  // 处理表单提交
  const handleSubmit = () => {
    form.validateFields().then(values => {
      console.log("表单数据:", values);
      setLoading(true);

      // 模拟API请求
      setTimeout(() => {
        const now = new Date().toISOString().replace("T", " ").substring(0, 19);

        if (editingConfig) {
          // 更新配置
          setData(data.map(item =>
            item.id === editingConfig.id
              ? { ...item, ...values, updatedAt: now }
              : item
          ));
          message.success("配置更新成功");
        } else {
          // 添加配置
          const newConfig = {
            id: Math.max(...data.map(item => item.id)) + 1,
            ...values,
            createdAt: now,
            updatedAt: now,
          };
          setData([...data, newConfig]);
          message.success("配置添加成功");
        }

        setLoading(false);
        setIsModalVisible(false);
      }, 1000);
    });
  };

  // 处理刷新缓存
  const handleRefreshCache = () => {
    setLoading(true);
    // 模拟API请求
    setTimeout(() => {
      setLoading(false);
      message.success("缓存刷新成功");
    }, 1000);
  };

  return (
    <div>
      <Title level={2}>系统配置</Title>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="系统配置" key="system" />
          <TabPane tab="业务配置" key="business" />
        </Tabs>

        <div className="flex justify-between mb-4">
          <Space>
            {session?.user.permissions.includes("config:edit") && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                添加配置
              </Button>
            )}
          </Space>

          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefreshCache}
            loading={loading}
          >
            刷新缓存
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingConfig ? "编辑配置" : "添加配置"}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loading}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="configKey"
            label="配置键"
            rules={[{ required: true, message: "请输入配置键" }]}
          >
            <Input disabled={!!editingConfig} />
          </Form.Item>

          <Form.Item
            name="configValue"
            label="配置值"
            rules={[{ required: true, message: "请输入配置值" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: "请选择状态" }]}
          >
            <Select>
              <Option value={1}>启用</Option>
              <Option value={0}>禁用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
