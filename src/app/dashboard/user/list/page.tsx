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
  Select,
  message,
  Popconfirm
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useSession } from "next-auth/react";

const { Title } = Typography;
const { Option } = Select;

interface UserData {
  id: number;
  username: string;
  email: string;
  phone: string | null;
  realName: string | null;
  organizationId: number | null;
  organizationName: string | null;
  status: number;
  userType: number;
  lastLoginTime: string | null;
  roles: string[];
}

export default function UserListPage() {
  const { data: session } = useSession();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<UserData[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);



  const columns: ColumnsType<UserData> = [
    {
      title: "用户名",
      dataIndex: "username",
      key: "username",
    },
    {
      title: "姓名",
      dataIndex: "realName",
      key: "realName",
    },
    {
      title: "邮箱",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "电话",
      dataIndex: "phone",
      key: "phone",
    },
    {
      title: "所属组织",
      dataIndex: "organizationName",
      key: "organizationName",
      render: (text) => text || "-",
    },
    {
      title: "用户类型",
      key: "userType",
      render: (_, record) => (
        <Tag color={record.userType === 1 ? "blue" : "green"}>
          {record.userType === 1 ? "内部用户" : "外部用户"}
        </Tag>
      ),
    },
    {
      title: "角色",
      key: "roles",
      render: (_, record) => (
        <>
          {record.roles.map(role => (
            <Tag color="purple" key={role}>
              {role}
            </Tag>
          ))}
        </>
      ),
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
      title: "最后登录时间",
      dataIndex: "lastLoginTime",
      key: "lastLoginTime",
      render: (text) => text || "-",
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
            <>
              <Popconfirm
                title="确定要删除此用户吗？"
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
              <Button
                type="text"
                icon={record.status === 1 ? <LockOutlined /> : <UnlockOutlined />}
                onClick={() => handleToggleStatus(record)}
                danger={record.status === 1}
              />
            </>
          )}
        </Space>
      ),
    },
  ];

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      // 获取用户列表
      const usersResponse = await fetch('/api/users');
      const usersData = await usersResponse.json();

      if (usersData.success) {
        setData(usersData.data.users);
      } else {
        message.error(usersData.message || '获取用户列表失败');
      }

      // 获取组织列表
      const orgsResponse = await fetch('/api/organizations?treeMode=false');
      const orgsData = await orgsResponse.json();

      if (orgsData.success) {
        setOrganizations(orgsData.data);
      } else {
        message.error(orgsData.message || '获取组织列表失败');
      }

      // 获取角色列表
      const rolesResponse = await fetch('/api/roles');
      const rolesData = await rolesResponse.json();

      if (rolesData.success) {
        setRoles(rolesData.data.roles);
      } else {
        message.error(rolesData.message || '获取角色列表失败');
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

  // 处理添加用户
  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();

    // 设置默认值
    form.setFieldsValue({
      status: 1,
      userType: 1,
    });

    setIsModalVisible(true);
  };

  // 处理编辑用户
  const handleEdit = async (record: UserData) => {
    setLoading(true);
    try {
      // 获取用户详情，包括角色信息
      const response = await fetch(`/api/users/${record.id}`);
      const result = await response.json();

      if (result.success) {
        const userData = result.data;
        setEditingUser(userData);

        // 设置表单值，包括正确的角色ID
        form.setFieldsValue({
          ...userData,
          roleIds: userData.roleIds || [],
        });
      } else {
        message.error(result.message || "获取用户详情失败");
        // 回退到使用当前记录
        setEditingUser(record);
        form.setFieldsValue({
          ...record,
          roleIds: roles
            .filter(role => record.roles.includes(role.name))
            .map(role => role.id),
        });
      }
    } catch (error) {
      console.error('获取用户详情错误:', error);
      message.error('获取用户详情失败，请稍后重试');
      // 回退到使用当前记录
      setEditingUser(record);
      form.setFieldsValue({
        ...record,
        roleIds: roles
          .filter(role => record.roles.includes(role.name))
          .map(role => role.id),
      });
    } finally {
      setLoading(false);
      setIsModalVisible(true);
    }
  };

  // 处理删除用户
  const handleDelete = async (id: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        message.success("用户删除成功");
        loadData(); // 重新加载数据
      } else {
        message.error(result.message || "用户删除失败");
      }
    } catch (error) {
      console.error('删除用户错误:', error);
      message.error('删除失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理切换用户状态
  const handleToggleStatus = async (record: UserData) => {
    setLoading(true);
    try {
      const newStatus = record.status === 1 ? 0 : 1;

      const response = await fetch(`/api/users/${record.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...record,
          status: newStatus,
        }),
      });

      const result = await response.json();

      if (result.success) {
        message.success(`用户${record.status === 1 ? "禁用" : "启用"}成功`);
        loadData(); // 重新加载数据
      } else {
        message.error(result.message || `用户${record.status === 1 ? "禁用" : "启用"}失败`);
      }
    } catch (error) {
      console.error('切换用户状态错误:', error);
      message.error('操作失败，请稍后重试');
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
        // 构建提交数据
        const submitData = {
          ...values,
        };

        if (editingUser) {
          // 更新用户
          const response = await fetch(`/api/users/${editingUser.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(submitData),
          });

          const result = await response.json();

          if (result.success) {
            message.success("用户更新成功");
            loadData(); // 重新加载数据
            setIsModalVisible(false);
          } else {
            message.error(result.message || "用户更新失败");
          }
        } else {
          // 添加用户
          const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(submitData),
          });

          const result = await response.json();

          if (result.success) {
            message.success("用户添加成功");
            loadData(); // 重新加载数据
            setIsModalVisible(false);
          } else {
            message.error(result.message || "用户添加失败");
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
      <Title level={2}>用户管理</Title>

      <Card>
        <div className="flex justify-between mb-4">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            添加用户
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
        title={editingUser ? "编辑用户" : "添加用户"}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input disabled={!!editingUser} />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: "请输入密码" }]}
            >
              <Input.Password />
            </Form.Item>
          )}

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: "请输入邮箱" },
              { type: "email", message: "请输入有效的邮箱地址" }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="realName"
            label="姓名"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="phone"
            label="电话"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="userType"
            label="用户类型"
            rules={[{ required: true, message: "请选择用户类型" }]}
          >
            <Select>
              <Option value={1}>内部用户</Option>
              <Option value={2}>外部用户</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="organizationId"
            label="所属组织"
            rules={[{ required: form.getFieldValue("userType") === 1, message: "请选择所属组织" }]}
          >
            <Select disabled={form.getFieldValue("userType") === 2}>
              {organizations.map(org => (
                <Option key={org.id} value={org.id}>{org.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="roleIds"
            label="角色"
            rules={[{ required: true, message: "请选择角色" }]}
          >
            <Select mode="multiple">
              {roles.map(role => (
                <Option key={role.id} value={role.id}>{role.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
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
