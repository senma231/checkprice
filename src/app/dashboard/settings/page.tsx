"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Typography,
  message,
  Tabs,
  Form,
  Input,
  Switch,
  Select,
  Space,
  Table,
  Tag,
  Popconfirm,
  Divider
} from "antd";
import {
  SaveOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined
} from "@ant-design/icons";
import axios from "axios";

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configurations, setConfigurations] = useState([]);
  const [systemForm] = Form.useForm();
  const [emailForm] = Form.useForm();
  const [storageForm] = Form.useForm();
  const [configForm] = Form.useForm();
  const [editingConfig, setEditingConfig] = useState(null);

  // 确保所有表单实例都被正确使用
  useEffect(() => {
    // 这个空的 useEffect 确保所有 form 实例都被正确使用
  }, [systemForm, emailForm, storageForm, configForm]);

  // 获取系统配置
  const fetchConfigurations = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/configurations');

      if (data.success) {
        setConfigurations(data.data);

        // 设置表单初始值
        const configMap = {};
        data.data.forEach(config => {
          configMap[config.configKey] = config.configValue;
        });

        // 系统设置
        systemForm.setFieldsValue({
          'system.name': configMap['system.name'] || '物流查价系统',
          'system.logo': configMap['system.logo'] || '',
          'system.description': configMap['system.description'] || '',
          'system.recordNumber': configMap['system.recordNumber'] || '',
          'system.contactPhone': configMap['system.contactPhone'] || '',
          'system.contactEmail': configMap['system.contactEmail'] || ''
        });

        // 邮件设置
        emailForm.setFieldsValue({
          'mail.enabled': configMap['mail.enabled'] === 'true',
          'mail.host': configMap['mail.host'] || '',
          'mail.port': configMap['mail.port'] || '25',
          'mail.username': configMap['mail.username'] || '',
          'mail.password': configMap['mail.password'] || '',
          'mail.from': configMap['mail.from'] || ''
        });

        // 存储设置
        storageForm.setFieldsValue({
          'storage.type': configMap['storage.type'] || 'local',
          'storage.local.path': configMap['storage.local.path'] || 'uploads',
          'storage.oss.endpoint': configMap['storage.oss.endpoint'] || '',
          'storage.oss.accessKey': configMap['storage.oss.accessKey'] || '',
          'storage.oss.secretKey': configMap['storage.oss.secretKey'] || '',
          'storage.oss.bucket': configMap['storage.oss.bucket'] || ''
        });
      } else {
        message.error(data.message || "获取系统配置失败");
      }
    } catch (error) {
      console.error("获取系统配置错误:", error);
      message.error("获取系统配置失败");
    } finally {
      setLoading(false);
    }
  };

  // 首次加载
  useEffect(() => {
    fetchConfigurations();
  }, []);

  // 保存系统设置
  const handleSaveSystem = async () => {
    try {
      const values = await systemForm.validateFields();
      setSaving(true);

      const configs = Object.keys(values).map(key => ({
        configKey: key,
        configValue: values[key]
      }));

      const { data } = await axios.post('/api/configurations/batch', { configs });

      if (data.success) {
        message.success("系统设置保存成功");
        fetchConfigurations();
      } else {
        message.error(data.message || "系统设置保存失败");
      }
    } catch (error) {
      console.error("保存系统设置错误:", error);
      message.error("系统设置保存失败");
    } finally {
      setSaving(false);
    }
  };

  // 保存邮件设置
  const handleSaveEmail = async () => {
    try {
      const values = await emailForm.validateFields();
      setSaving(true);

      // 转换布尔值为字符串
      values['mail.enabled'] = values['mail.enabled'].toString();

      const configs = Object.keys(values).map(key => ({
        configKey: key,
        configValue: values[key]
      }));

      const { data } = await axios.post('/api/configurations/batch', { configs });

      if (data.success) {
        message.success("邮件设置保存成功");
        fetchConfigurations();
      } else {
        message.error(data.message || "邮件设置保存失败");
      }
    } catch (error) {
      console.error("保存邮件设置错误:", error);
      message.error("邮件设置保存失败");
    } finally {
      setSaving(false);
    }
  };

  // 保存存储设置
  const handleSaveStorage = async () => {
    try {
      const values = await storageForm.validateFields();
      setSaving(true);

      const configs = Object.keys(values).map(key => ({
        configKey: key,
        configValue: values[key]
      }));

      const { data } = await axios.post('/api/configurations/batch', { configs });

      if (data.success) {
        message.success("存储设置保存成功");
        fetchConfigurations();
      } else {
        message.error(data.message || "存储设置保存失败");
      }
    } catch (error) {
      console.error("保存存储设置错误:", error);
      message.error("存储设置保存失败");
    } finally {
      setSaving(false);
    }
  };

  // 添加/编辑配置
  const handleSaveConfig = async () => {
    try {
      const values = await configForm.validateFields();
      setSaving(true);

      if (editingConfig) {
        // 更新配置
        const { data } = await axios.put(`/api/configurations/${editingConfig.id}`, values);

        if (data.success) {
          message.success("配置更新成功");
          setEditingConfig(null);
          configForm.resetFields();
          fetchConfigurations();
        } else {
          message.error(data.message || "配置更新失败");
        }
      } else {
        // 添加配置
        const { data } = await axios.post('/api/configurations', values);

        if (data.success) {
          message.success("配置添加成功");
          configForm.resetFields();
          fetchConfigurations();
        } else {
          message.error(data.message || "配置添加失败");
        }
      }
    } catch (error) {
      console.error("保存配置错误:", error);
      message.error("配置保存失败");
    } finally {
      setSaving(false);
    }
  };

  // 删除配置
  const handleDeleteConfig = async (id) => {
    try {
      const { data } = await axios.delete(`/api/configurations/${id}`);

      if (data.success) {
        message.success("配置删除成功");
        fetchConfigurations();
      } else {
        message.error(data.message || "配置删除失败");
      }
    } catch (error) {
      console.error("删除配置错误:", error);
      message.error("配置删除失败");
    }
  };

  // 编辑配置
  const handleEditConfig = (config) => {
    setEditingConfig(config);
    configForm.setFieldsValue(config);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingConfig(null);
    configForm.resetFields();
  };

  // 配置表格列
  const configColumns = [
    {
      title: "配置键",
      dataIndex: "configKey",
      key: "configKey",
    },
    {
      title: "配置值",
      dataIndex: "configValue",
      key: "configValue",
      ellipsis: true,
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
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEditConfig(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此配置吗?"
            onConfirm={() => handleDeleteConfig(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Title level={2} className="mb-6">系统设置</Title>

      <Tabs
        defaultActiveKey="system"
        items={[
          {
            key: 'system',
            label: '基本设置',
            children: (
              <Card>
                <Form
                  form={systemForm}
                  layout="vertical"
                  disabled={loading}
                >
                  <Form.Item
                    name="system.name"
                    label="系统名称"
                    rules={[{ required: true, message: "请输入系统名称" }]}
                  >
                    <Input placeholder="输入系统名称" />
                  </Form.Item>

                  <Form.Item
                    name="system.logo"
                    label="系统Logo URL"
                  >
                    <Input placeholder="输入Logo URL" />
                  </Form.Item>

                  <Form.Item
                    name="system.description"
                    label="系统描述"
                  >
                    <TextArea rows={4} placeholder="输入系统描述" />
                  </Form.Item>

                  <Form.Item
                    name="system.recordNumber"
                    label="备案号"
                  >
                    <Input placeholder="输入备案号" />
                  </Form.Item>

                  <Form.Item
                    name="system.contactPhone"
                    label="联系电话"
                  >
                    <Input placeholder="输入联系电话" />
                  </Form.Item>

                  <Form.Item
                    name="system.contactEmail"
                    label="联系邮箱"
                  >
                    <Input placeholder="输入联系邮箱" />
                  </Form.Item>

                  <Form.Item>
                    <Space>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSaveSystem}
                        loading={saving}
                      >
                        保存设置
                      </Button>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() => fetchConfigurations()}
                      >
                        重置
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </Card>
            )
          },
          {
            key: 'email',
            label: '邮件设置',
            children: (
              <Card>
                <Form
                  form={emailForm}
                  layout="vertical"
                  disabled={loading}
                >
                  <Form.Item
                    name="mail.enabled"
                    label="启用邮件"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>

                  <Form.Item
                    name="mail.host"
                    label="SMTP服务器"
                    rules={[{ required: true, message: "请输入SMTP服务器" }]}
                  >
                    <Input placeholder="输入SMTP服务器地址" />
                  </Form.Item>

                  <Form.Item
                    name="mail.port"
                    label="SMTP端口"
                    rules={[{ required: true, message: "请输入SMTP端口" }]}
                  >
                    <Input placeholder="输入SMTP端口" />
                  </Form.Item>

                  <Form.Item
                    name="mail.username"
                    label="邮箱账号"
                    rules={[{ required: true, message: "请输入邮箱账号" }]}
                  >
                    <Input placeholder="输入邮箱账号" />
                  </Form.Item>

                  <Form.Item
                    name="mail.password"
                    label="邮箱密码"
                    rules={[{ required: true, message: "请输入邮箱密码" }]}
                  >
                    <Input.Password placeholder="输入邮箱密码" />
                  </Form.Item>

                  <Form.Item
                    name="mail.from"
                    label="发件人"
                    rules={[{ required: true, message: "请输入发件人" }]}
                  >
                    <Input placeholder="输入发件人" />
                  </Form.Item>

                  <Form.Item>
                    <Space>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSaveEmail}
                        loading={saving}
                      >
                        保存设置
                      </Button>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() => fetchConfigurations()}
                      >
                        重置
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </Card>
            )
          },
          {
            key: 'storage',
            label: '存储设置',
            children: (
              <Card>
                <Form
                  form={storageForm}
                  layout="vertical"
                  disabled={loading}
                >
                  <Form.Item
                    name="storage.type"
                    label="存储类型"
                    rules={[{ required: true, message: "请选择存储类型" }]}
                  >
                    <Select placeholder="选择存储类型">
                      <Option value="local">本地存储</Option>
                      <Option value="oss">对象存储(OSS)</Option>
                    </Select>
                  </Form.Item>

                  <Divider>本地存储配置</Divider>

                  <Form.Item
                    name="storage.local.path"
                    label="本地存储路径"
                  >
                    <Input placeholder="输入本地存储路径" />
                  </Form.Item>

                  <Divider>对象存储配置</Divider>

                  <Form.Item
                    name="storage.oss.endpoint"
                    label="OSS端点"
                  >
                    <Input placeholder="输入OSS端点" />
                  </Form.Item>

                  <Form.Item
                    name="storage.oss.accessKey"
                    label="AccessKey"
                  >
                    <Input placeholder="输入AccessKey" />
                  </Form.Item>

                  <Form.Item
                    name="storage.oss.secretKey"
                    label="SecretKey"
                  >
                    <Input.Password placeholder="输入SecretKey" />
                  </Form.Item>

                  <Form.Item
                    name="storage.oss.bucket"
                    label="Bucket名称"
                  >
                    <Input placeholder="输入Bucket名称" />
                  </Form.Item>

                  <Form.Item>
                    <Space>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSaveStorage}
                        loading={saving}
                      >
                        保存设置
                      </Button>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() => fetchConfigurations()}
                      >
                        重置
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </Card>
            )
          },
          {
            key: 'announcements',
            label: '公告管理',
            children: (
              <iframe
                src="/dashboard/settings/announcements"
                style={{ width: '100%', height: '800px', border: 'none' }}
              />
            )
          },
          {
            key: 'custom',
            label: '自定义配置',
            children: (
              <>
                <Card className="mb-6">
                  <Form
                    form={configForm}
                    layout="vertical"
                    disabled={loading}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Form.Item
                        name="configKey"
                        label="配置键"
                        rules={[{ required: true, message: "请输入配置键" }]}
                      >
                        <Input placeholder="输入配置键" />
                      </Form.Item>

                      <Form.Item
                        name="configValue"
                        label="配置值"
                        rules={[{ required: true, message: "请输入配置值" }]}
                      >
                        <Input placeholder="输入配置值" />
                      </Form.Item>
                    </div>

                    <Form.Item
                      name="description"
                      label="描述"
                    >
                      <TextArea rows={2} placeholder="输入配置描述" />
                    </Form.Item>

                    <Form.Item
                      name="status"
                      label="状态"
                      initialValue={1}
                    >
                      <Select placeholder="选择状态">
                        <Option value={1}>启用</Option>
                        <Option value={0}>禁用</Option>
                      </Select>
                    </Form.Item>

                    <Form.Item>
                      <Space>
                        <Button
                          type="primary"
                          icon={editingConfig ? <EditOutlined /> : <PlusOutlined />}
                          onClick={handleSaveConfig}
                          loading={saving}
                        >
                          {editingConfig ? "更新配置" : "添加配置"}
                        </Button>
                        {editingConfig && (
                          <Button onClick={handleCancelEdit}>
                            取消编辑
                          </Button>
                        )}
                      </Space>
                    </Form.Item>
                  </Form>
                </Card>

                <Card>
                  <Table
                    columns={configColumns}
                    dataSource={configurations}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                  />
                </Card>
              </>
            )
          }
        ]}
      />
    </div>
  );
}
