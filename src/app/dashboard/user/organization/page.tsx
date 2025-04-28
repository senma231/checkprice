"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Tree,
  Typography,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Popconfirm
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownOutlined
} from "@ant-design/icons";
import type { DataNode } from "antd/es/tree";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface OrganizationData {
  id: number;
  name: string;
  parentId: number | null;
  level: number;
  description: string | null;
  status: number;
  children?: OrganizationData[];
}

export default function OrganizationPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OrganizationData[]>([]);
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrganizationData | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);



  // 将组织数据转换为树形结构
  const convertToTreeData = (orgs: OrganizationData[]): DataNode[] => {
    return orgs.map(org => ({
      title: (
        <div className="flex items-center justify-between">
          <span>{org.name}</span>
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(org);
              }}
            />
            {org.id !== 1 && (
              <Popconfirm
                title="确定要删除此组织吗？"
                onConfirm={(e) => {
                  e?.stopPropagation();
                  handleDelete(org.id);
                }}
                onCancel={(e) => e?.stopPropagation()}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            )}
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleAddChild(org);
              }}
            />
          </Space>
        </div>
      ),
      key: org.id.toString(),
      children: org.children ? convertToTreeData(org.children) : undefined
    }));
  };

  // 获取所有组织的扁平列表（用于选择父组织）
  const getAllOrganizations = (orgs: OrganizationData[], result: OrganizationData[] = []): OrganizationData[] => {
    orgs.forEach(org => {
      result.push(org);
      if (org.children) {
        getAllOrganizations(org.children, result);
      }
    });
    return result;
  };

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      // 获取组织列表
      const response = await fetch('/api/organizations?treeMode=true');
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setTreeData(convertToTreeData(result.data));

        // 默认展开所有节点
        const allKeys = getAllOrganizations(result.data).map(org => org.id.toString());
        setExpandedKeys(allKeys);
      } else {
        message.error(result.message || '获取组织列表失败');
      }
    } catch (error) {
      console.error('加载组织数据错误:', error);
      message.error('加载组织数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 组件加载时获取数据
  useEffect(() => {
    loadData();
  }, []);

  // 处理添加顶级组织
  const handleAddRoot = () => {
    setEditingOrg(null);
    form.resetFields();

    // 设置默认值
    form.setFieldsValue({
      parentId: null,
      level: 1,
      status: 1,
    });

    setIsModalVisible(true);
  };

  // 处理添加子组织
  const handleAddChild = (parent: OrganizationData) => {
    setEditingOrg(null);
    form.resetFields();

    // 设置默认值
    form.setFieldsValue({
      parentId: parent.id,
      level: parent.level + 1,
      status: 1,
    });

    setIsModalVisible(true);
  };

  // 处理编辑组织
  const handleEdit = (org: OrganizationData) => {
    setEditingOrg(org);
    form.setFieldsValue(org);
    setIsModalVisible(true);
  };

  // 处理删除组织
  const handleDelete = async (id: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/organizations/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        message.success("组织删除成功");
        loadData(); // 重新加载数据
      } else {
        message.error(result.message || "组织删除失败");
      }
    } catch (error) {
      console.error('删除组织错误:', error);
      message.error('删除失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理表单提交
  const handleSubmit = () => {
    form.validateFields().then(async values => {
      console.log("表单数据:", values);
      setLoading(true);

      try {
        if (editingOrg) {
          // 更新组织
          const response = await fetch(`/api/organizations/${editingOrg.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(values),
          });

          const result = await response.json();

          if (result.success) {
            message.success("组织更新成功");
            loadData(); // 重新加载数据
            setIsModalVisible(false);
          } else {
            message.error(result.message || "组织更新失败");
          }
        } else {
          // 添加组织
          const response = await fetch('/api/organizations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(values),
          });

          const result = await response.json();

          if (result.success) {
            message.success("组织添加成功");

            // 展开新添加组织的父节点
            if (values.parentId !== null) {
              setExpandedKeys([...expandedKeys, values.parentId.toString()]);
            }

            loadData(); // 重新加载数据
            setIsModalVisible(false);
          } else {
            message.error(result.message || "组织添加失败");
          }
        }
      } catch (error) {
        console.error('提交表单错误:', error);
        message.error('操作失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <div>
      <Title level={2}>组织管理</Title>

      <Card>
        <div className="flex justify-between mb-4">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddRoot}
          >
            添加顶级组织
          </Button>
        </div>

        <div className="bg-gray-50 p-4 rounded">
          {loading ? (
            <div className="text-center py-8">加载中...</div>
          ) : (
            treeData.length > 0 ? (
              <Tree
                showLine
                switcherIcon={<DownOutlined />}
                treeData={treeData}
                selectedKeys={selectedKeys}
                expandedKeys={expandedKeys}
                onSelect={(keys) => setSelectedKeys(keys as string[])}
                onExpand={(keys) => setExpandedKeys(keys as string[])}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                暂无组织数据，请添加组织
              </div>
            )
          )}
        </div>
      </Card>

      <Modal
        title={editingOrg ? "编辑组织" : "添加组织"}
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
            name="name"
            label="组织名称"
            rules={[{ required: true, message: "请输入组织名称" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="parentId"
            label="上级组织"
          >
            <Select allowClear disabled={editingOrg?.id === 1}>
              <Option value={null}>无 (顶级组织)</Option>
              {getAllOrganizations(data)
                .filter(org => editingOrg ? org.id !== editingOrg.id : true)
                .map(org => (
                  <Option key={org.id} value={org.id}>
                    {org.name}
                  </Option>
                ))
              }
            </Select>
          </Form.Item>

          <Form.Item
            name="level"
            label="组织层级"
            rules={[{ required: true, message: "请输入组织层级" }]}
          >
            <InputNumber min={1} max={10} style={{ width: '100%' }} />
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
              <Option value={1}>正常</Option>
              <Option value={0}>禁用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
