"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Table,
  Typography,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Tree,
  Drawer,
  Select
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { DataNode } from "antd/es/tree";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface RoleData {
  id: number;
  name: string;
  description: string | null;
  status: number;
  createdAt: string;
  updatedAt: string;
}

interface PermissionData {
  id: number;
  name: string;
  code: string;
  description: string | null;
}

export default function RoleManagePage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RoleData[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleData | null>(null);
  const [isPermissionDrawerVisible, setIsPermissionDrawerVisible] = useState(false);
  const [currentRoleId, setCurrentRoleId] = useState<number | null>(null);
  const [currentRoleName, setCurrentRoleName] = useState<string>("");
  const [permissionTree, setPermissionTree] = useState<DataNode[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);







  const columns: ColumnsType<RoleData> = [
    {
      title: "角色名称",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "状态",
      key: "status",
      render: (_, record) => (
        <Tag color={record.status === 1 ? "green" : "red"}>
          {record.status === 1 ? "正常" : "已禁用"}
        </Tag>
      ),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      key: "updatedAt",
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          {record.id !== 1 && (
            <Popconfirm
              title="确定要删除此角色吗？"
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
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={() => handlePermissionSetting(record)}
          />
        </Space>
      ),
    },
  ];

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      // 获取角色列表
      const rolesResponse = await fetch('/api/roles');
      const rolesData = await rolesResponse.json();

      if (rolesData.success) {
        setData(rolesData.data.roles);
      } else {
        message.error(rolesData.message || '获取角色列表失败');
      }

      // 获取权限树
      const permissionsResponse = await fetch('/api/permissions?treeMode=true');
      const permissionsData = await permissionsResponse.json();

      if (permissionsData.success) {
        setPermissionTree(permissionsData.data);
      } else {
        message.error(permissionsData.message || '获取权限列表失败');
      }
    } catch (error) {
      console.error('加载数据错误:', error);
      message.error('加载数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 组件加载时获取数据
  useEffect(() => {
    loadData();
  }, []);

  // 处理添加角色
  const handleAdd = () => {
    setEditingRole(null);
    form.resetFields();

    // 设置默认值
    form.setFieldsValue({
      status: 1,
    });

    setIsModalVisible(true);
  };

  // 处理编辑角色
  const handleEdit = (record: RoleData) => {
    setEditingRole(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  // 处理删除角色
  const handleDelete = async (id: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/roles/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        message.success("角色删除成功");
        loadData(); // 重新加载数据
      } else {
        message.error(result.message || "角色删除失败");
      }
    } catch (error) {
      console.error('删除角色错误:', error);
      message.error('删除失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理权限设置
  const handlePermissionSetting = async (record: RoleData) => {
    setCurrentRoleId(record.id);
    setCurrentRoleName(record.name);
    setLoading(true);

    try {
      // 获取角色权限
      const response = await fetch(`/api/roles/${record.id}/permissions`);
      const result = await response.json();

      if (result.success) {
        setCheckedKeys(result.data.assignedPermissionCodes || []);
      } else {
        message.error(result.message || "获取角色权限失败");
        setCheckedKeys([]);
      }
    } catch (error) {
      console.error('获取角色权限错误:', error);
      message.error('获取角色权限失败，请稍后重试');
      setCheckedKeys([]);
    } finally {
      setLoading(false);
      setIsPermissionDrawerVisible(true);
    }
  };

  // 处理权限选择变化
  const handlePermissionChange = (checkedKeysValue: any) => {
    setCheckedKeys(checkedKeysValue);
  };

  // 处理保存权限
  const handleSavePermissions = async () => {
    if (!currentRoleId) return;

    setLoading(true);
    try {
      // 保存角色权限
      const response = await fetch(`/api/roles/${currentRoleId}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permissionCodes: checkedKeys
        }),
      });

      const result = await response.json();

      if (result.success) {
        message.success("权限设置保存成功");
        setIsPermissionDrawerVisible(false);
      } else {
        message.error(result.message || "权限设置保存失败");
      }
    } catch (error) {
      console.error('保存权限错误:', error);
      message.error('保存权限失败，请稍后重试');
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
        if (editingRole) {
          // 更新角色
          const response = await fetch(`/api/roles/${editingRole.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(values),
          });

          const result = await response.json();

          if (result.success) {
            message.success("角色更新成功");
            loadData(); // 重新加载数据
          } else {
            message.error(result.message || "角色更新失败");
          }
        } else {
          // 添加角色
          const response = await fetch('/api/roles', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(values),
          });

          const result = await response.json();

          if (result.success) {
            message.success("角色添加成功");
            loadData(); // 重新加载数据
          } else {
            message.error(result.message || "角色添加失败");
          }
        }

        setIsModalVisible(false);
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
      <Title level={2}>角色管理</Title>

      <Card>
        <div className="flex justify-between mb-4">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            添加角色
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
        title={editingRole ? "编辑角色" : "添加角色"}
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
            label="角色名称"
            rules={[{ required: true, message: "请输入角色名称" }]}
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
              <Option value={1}>正常</Option>
              <Option value={0}>禁用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={`权限设置 - ${currentRoleName}`}
        placement="right"
        width={500}
        onClose={() => setIsPermissionDrawerVisible(false)}
        open={isPermissionDrawerVisible}
        extra={
          <Button
            type="primary"
            onClick={handleSavePermissions}
            loading={loading}
          >
            保存
          </Button>
        }
      >
        <div className="mb-4">
          <Text>请选择该角色拥有的权限：</Text>
        </div>

        <Tree
          checkable
          checkedKeys={checkedKeys}
          onCheck={handlePermissionChange}
          treeData={permissionTree}
          defaultExpandAll
        />
      </Drawer>
    </div>
  );
}
