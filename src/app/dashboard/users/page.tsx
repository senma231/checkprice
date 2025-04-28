"use client";

import { useState, useEffect } from "react";
import {
  Table,
  Button,
  Card,
  Space,
  Typography,
  message,
  Popconfirm,
  Tag,
  Input,
  Select,
  Form,
  Modal
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  LockOutlined,
  UnlockOutlined
} from "@ant-design/icons";
import axios from "axios";
import { useRouter } from "next/navigation";

const { Title } = Typography;
const { Option } = Select;
const { Search } = Input;

export default function UsersPage() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [searchForm] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalForm] = Form.useForm();
  const [editingUser, setEditingUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [roles, setRoles] = useState([]);
  const router = useRouter();

  // 获取用户列表
  const fetchUsers = async (params = {}) => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/users', {
        params: {
          ...params,
          page: params.current || pagination.current,
          pageSize: params.pageSize || pagination.pageSize
        }
      });

      if (data.success) {
        setUsers(data.data.users);
        setPagination({
          ...pagination,
          current: data.data.pagination.current,
          total: data.data.pagination.total
        });
      } else {
        message.error(data.message || "获取用户列表失败");
      }
    } catch (error) {
      console.error("获取用户列表错误:", error);
      message.error("获取用户列表失败");
    } finally {
      setLoading(false);
    }
  };

  // 获取组织和角色数据
  const fetchOrganizationsAndRoles = async () => {
    try {
      const [orgResponse, rolesResponse] = await Promise.all([
        axios.get('/api/organizations'),
        axios.get('/api/roles')
      ]);

      if (orgResponse.data.success) {
        setOrganizations(orgResponse.data.data);
      }

      if (rolesResponse.data.success) {
        console.log("角色数据:", rolesResponse.data);
        setRoles(rolesResponse.data.data);
      }
    } catch (error) {
      console.error("获取组织和角色数据错误:", error);
      message.error("获取组织和角色数据失败");
    }
  };

  // 首次加载
  useEffect(() => {
    fetchUsers();
    fetchOrganizationsAndRoles();
  }, []);

  // 表格变化处理
  const handleTableChange = (pagination) => {
    fetchUsers({ current: pagination.current });
  };

  // 删除用户
  const handleDelete = async (id) => {
    try {
      const { data } = await axios.delete(`/api/users/${id}`);
      if (data.success) {
        message.success("删除成功");
        fetchUsers();
      } else {
        message.error(data.message || "删除失败");
      }
    } catch (error) {
      console.error("删除用户错误:", error);
      message.error("删除失败");
    }
  };

  // 搜索
  const handleSearch = (values) => {
    fetchUsers({ ...values, current: 1 });
  };

  // 重置搜索
  const handleReset = () => {
    searchForm.resetFields();
    fetchUsers({ current: 1 });
  };

  // 打开编辑/创建模态框
  const openModal = (user = null) => {
    setEditingUser(user);
    modalForm.resetFields();

    if (user) {
      modalForm.setFieldsValue({
        ...user,
        roleIds: user.userRoles?.map(ur => ur.roleId) || []
      });
    }

    setModalVisible(true);
  };

  // 提交表单
  const handleModalSubmit = async () => {
    try {
      const values = await modalForm.validateFields();

      if (editingUser) {
        // 更新用户
        const { data } = await axios.put(`/api/users/${editingUser.id}`, values);
        if (data.success) {
          message.success("更新用户成功");
          setModalVisible(false);
          fetchUsers();
        } else {
          message.error(data.message || "更新用户失败");
        }
      } else {
        // 创建用户
        const { data } = await axios.post('/api/users', values);
        if (data.success) {
          message.success("创建用户成功");
          setModalVisible(false);
          fetchUsers();
        } else {
          message.error(data.message || "创建用户失败");
        }
      }
    } catch (error) {
      console.error("提交表单错误:", error);
      message.error("操作失败");
    }
  };

  // 修改用户状态
  const handleToggleStatus = async (user) => {
    try {
      const { data } = await axios.patch(`/api/users/${user.id}/status`, {
        status: user.status === 1 ? 0 : 1
      });

      if (data.success) {
        message.success(`用户已${user.status === 1 ? '禁用' : '启用'}`);
        fetchUsers();
      } else {
        message.error(data.message || "操作失败");
      }
    } catch (error) {
      console.error("修改用户状态错误:", error);
      message.error("操作失败");
    }
  };

  // 表格列定义
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "用户名",
      dataIndex: "username",
      key: "username",
    },
    {
      title: "姓名",
      dataIndex: "realName",
      key: "realName",
      render: (text) => text || "-",
    },
    {
      title: "邮箱",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "用户类型",
      dataIndex: "userType",
      key: "userType",
      render: (userType) => (
        <Tag color={userType === 1 ? "blue" : "green"}>
          {userType === 1 ? "内部用户" : "外部用户"}
        </Tag>
      ),
    },
    {
      title: "所属组织",
      dataIndex: "organization",
      key: "organization",
      render: (org) => org?.name || "-",
    },
    {
      title: "角色",
      key: "roles",
      render: (_, record) => (
        <span>
          {record.userRoles?.map(ur => (
            <Tag key={ur.roleId} color="blue">{ur.role.name}</Tag>
          )) || "-"}
        </span>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === 1 ? "green" : "red"}>
          {status === 1 ? "正常" : "禁用"}
        </Tag>
      ),
    },
    {
      title: "最后登录",
      dataIndex: "lastLoginTime",
      key: "lastLoginTime",
      render: (time) => time ? new Date(time).toLocaleString() : "-",
    },
    {
      title: "操作",
      key: "action",
      width: 220,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="small"
            onClick={() => openModal(record)}
          >
            编辑
          </Button>
          <Button
            type={record.status === 1 ? "default" : "primary"}
            icon={record.status === 1 ? <LockOutlined /> : <UnlockOutlined />}
            size="small"
            onClick={() => handleToggleStatus(record)}
          >
            {record.status === 1 ? "禁用" : "启用"}
          </Button>
          <Popconfirm
            title="确定要删除此用户吗?"
            onConfirm={() => handleDelete(record.id)}
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
      <div className="flex justify-between items-center mb-6">
        <Title level={2}>用户管理</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openModal()}
        >
          添加用户
        </Button>
      </div>

      <Card className="mb-6">
        <Form
          form={searchForm}
          layout="inline"
          onFinish={handleSearch}
          className="w-full"
        >
          <Form.Item name="username" label="用户名">
            <Input placeholder="输入用户名" />
          </Form.Item>
          <Form.Item name="userType" label="用户类型">
            <Select style={{ width: 150 }} allowClear placeholder="选择用户类型">
              <Option value="1">内部用户</Option>
              <Option value="2">外部用户</Option>
            </Select>
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select style={{ width: 150 }} allowClear placeholder="选择状态">
              <Option value="1">正常</Option>
              <Option value="0">禁用</Option>
            </Select>
          </Form.Item>
          <Form.Item name="organizationId" label="组织">
            <Select style={{ width: 150 }} allowClear placeholder="选择组织">
              {Array.isArray(organizations) && organizations.map(org => (
                <Option key={org.id} value={org.id}>{org.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                搜索
              </Button>
              <Button onClick={handleReset} icon={<ReloadOutlined />}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          pagination={pagination}
          loading={loading}
          onChange={handleTableChange}
        />
      </Card>

      {/* 用户编辑/创建模态框 */}
      <Modal
        title={editingUser ? "编辑用户" : "创建用户"}
        open={modalVisible}
        onOk={handleModalSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
      >
        <Form
          form={modalForm}
          layout="vertical"
          initialValues={{
            status: 1,
            userType: 1
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: "请输入用户名" }]}
            >
              <Input placeholder="输入用户名" />
            </Form.Item>

            {!editingUser && (
              <Form.Item
                name="password"
                label="密码"
                rules={[{ required: true, message: "请输入密码" }]}
              >
                <Input.Password placeholder="输入密码" />
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
              <Input placeholder="输入邮箱" />
            </Form.Item>

            <Form.Item
              name="phone"
              label="电话"
            >
              <Input placeholder="输入电话" />
            </Form.Item>

            <Form.Item
              name="realName"
              label="姓名"
            >
              <Input placeholder="输入姓名" />
            </Form.Item>

            <Form.Item
              name="userType"
              label="用户类型"
              rules={[{ required: true, message: "请选择用户类型" }]}
            >
              <Select placeholder="选择用户类型">
                <Option value={1}>内部用户</Option>
                <Option value={2}>外部用户</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="organizationId"
              label="所属组织"
            >
              <Select placeholder="选择组织" allowClear>
                {Array.isArray(organizations) && organizations.map(org => (
                  <Option key={org.id} value={org.id}>{org.name}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="status"
              label="状态"
              rules={[{ required: true, message: "请选择状态" }]}
            >
              <Select placeholder="选择状态">
                <Option value={1}>正常</Option>
                <Option value={0}>禁用</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            name="roleIds"
            label="角色"
            rules={[{ required: true, message: "请选择至少一个角色" }]}
          >
            <Select
              placeholder="选择角色"
              mode="multiple"
              optionFilterProp="children"
            >
              {Array.isArray(roles) && roles.map(role => (
                <Option key={role.id} value={role.id}>{role.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
