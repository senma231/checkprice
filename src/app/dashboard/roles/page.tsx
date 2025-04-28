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
  Form,
  Modal,
  Tabs,
  Tree,
  Checkbox,
  Divider
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
  SaveOutlined
} from "@ant-design/icons";
import axios from "axios";

const { Title } = Typography;
const { TabPane } = Tabs;

export default function RolesPage() {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [permissionTree, setPermissionTree] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [modalForm] = Form.useForm();
  const [editingRole, setEditingRole] = useState(null);
  const [currentRolePermissions, setCurrentRolePermissions] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [checkedKeys, setCheckedKeys] = useState([]);

  // 获取角色列表
  const fetchRoles = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/roles');

      if (data.success) {
        // 检查返回的数据结构
        if (data.data.roles) {
          // 如果返回的是 { roles, pagination } 结构
          setRoles(data.data.roles);
        } else {
          // 如果直接返回角色数组
          setRoles(data.data);
        }
      } else {
        message.error(data.message || "获取角色列表失败");
      }
    } catch (error) {
      console.error("获取角色列表错误:", error);
      message.error("获取角色列表失败");
    } finally {
      setLoading(false);
    }
  };

  // 获取权限列表
  const fetchPermissions = async () => {
    try {
      const { data } = await axios.get('/api/permissions');

      if (data.success) {
        setPermissions(data.data);

        // 构建权限树
        const tree = buildPermissionTree(data.data);
        setPermissionTree(tree);

        // 默认展开所有节点
        const allKeys = getAllKeys(tree);
        setExpandedKeys(allKeys);
      } else {
        message.error(data.message || "获取权限列表失败");
      }
    } catch (error) {
      console.error("获取权限列表错误:", error);
      message.error("获取权限列表失败");
    }
  };

  // 获取所有节点的key
  const getAllKeys = (tree) => {
    const keys = [];
    const traverse = (nodes) => {
      nodes.forEach(node => {
        keys.push(node.key);
        if (node.children) {
          traverse(node.children);
        }
      });
    };
    traverse(tree);
    return keys;
  };

  // 构建权限树
  const buildPermissionTree = (permissions) => {
    // 按模块分组
    const moduleMap = {};

    permissions.forEach(perm => {
      const [module, action] = perm.code.split(':');

      if (!moduleMap[module]) {
        moduleMap[module] = {
          key: module,
          title: getModuleTitle(module),
          children: []
        };
      }

      moduleMap[module].children.push({
        key: perm.code,
        title: perm.name,
        id: perm.id
      });
    });

    return Object.values(moduleMap);
  };

  // 获取模块标题
  const getModuleTitle = (moduleCode) => {
    const moduleTitles = {
      'user': '用户管理',
      'role': '角色管理',
      'permission': '权限管理',
      'organization': '组织管理',
      'price': '价格管理',
      'system': '系统管理',
      'report': '报表管理',
      'log': '日志管理'
    };

    return moduleTitles[moduleCode] || moduleCode;
  };

  // 首次加载
  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  // 删除角色
  const handleDelete = async (id) => {
    try {
      const { data } = await axios.delete(`/api/roles/${id}`);
      if (data.success) {
        message.success("删除成功");
        fetchRoles();
      } else {
        message.error(data.message || "删除失败");
      }
    } catch (error) {
      console.error("删除角色错误:", error);
      message.error("删除失败");
    }
  };

  // 打开编辑/创建模态框
  const openModal = (role = null) => {
    setEditingRole(role);
    modalForm.resetFields();

    if (role) {
      modalForm.setFieldsValue(role);
    }

    setModalVisible(true);
  };

  // 打开权限设置模态框
  const openPermissionModal = async (role) => {
    setEditingRole(role);

    try {
      const { data } = await axios.get(`/api/roles/${role.id}/permissions`);

      if (data.success) {
        // 检查返回的数据结构
        if (data.data.assignedPermissionCodes) {
          // 如果返回的是新的数据结构
          const permissionCodes = data.data.assignedPermissionCodes;
          setCurrentRolePermissions(data.data);
          setSelectedPermissions(permissionCodes);
          setCheckedKeys(permissionCodes);
        } else {
          // 如果返回的是旧的数据结构
          const permissionIds = Array.isArray(data.data) ? data.data.map(p => p.code) : [];
          setCurrentRolePermissions(data.data);
          setSelectedPermissions(permissionIds);
          setCheckedKeys(permissionIds);
        }
        setPermissionModalVisible(true);
      } else {
        message.error(data.message || "获取角色权限失败");
      }
    } catch (error) {
      console.error("获取角色权限错误:", error);
      message.error("获取角色权限失败");
    }
  };

  // 提交角色表单
  const handleModalSubmit = async () => {
    try {
      const values = await modalForm.validateFields();

      if (editingRole) {
        // 更新角色
        const { data } = await axios.put(`/api/roles/${editingRole.id}`, values);
        if (data.success) {
          message.success("更新角色成功");
          setModalVisible(false);
          fetchRoles();
        } else {
          message.error(data.message || "更新角色失败");
        }
      } else {
        // 创建角色
        const { data } = await axios.post('/api/roles', values);
        if (data.success) {
          message.success("创建角色成功");
          setModalVisible(false);
          fetchRoles();
        } else {
          message.error(data.message || "创建角色失败");
        }
      }
    } catch (error) {
      console.error("提交表单错误:", error);
      message.error("操作失败");
    }
  };

  // 保存角色权限
  const handleSavePermissions = async () => {
    try {
      const { data } = await axios.post(`/api/roles/${editingRole.id}/permissions`, {
        permissionCodes: selectedPermissions
      });

      if (data.success) {
        message.success("权限设置成功");
        setPermissionModalVisible(false);
        fetchRoles();
      } else {
        message.error(data.message || "权限设置失败");
      }
    } catch (error) {
      console.error("设置权限错误:", error);
      message.error("权限设置失败");
    }
  };

  // 处理权限树选择变化
  const handlePermissionCheck = (checkedKeys) => {
    setCheckedKeys(checkedKeys);
    setSelectedPermissions(checkedKeys);
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
      title: "角色名称",
      dataIndex: "name",
      key: "name",
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
          {status === 1 ? "正常" : "禁用"}
        </Tag>
      ),
    },
    {
      title: "权限数量",
      key: "permissionCount",
      render: (_, record) => (
        <span>{record.rolePermissions?.length || 0}</span>
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 250,
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
            icon={<KeyOutlined />}
            size="small"
            onClick={() => openPermissionModal(record)}
          >
            设置权限
          </Button>
          <Popconfirm
            title="确定要删除此角色吗?"
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
        <Title level={2}>角色管理</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openModal()}
        >
          添加角色
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={roles}
          rowKey="id"
          loading={loading}
        />
      </Card>

      {/* 角色编辑/创建模态框 */}
      <Modal
        title={editingRole ? "编辑角色" : "创建角色"}
        open={modalVisible}
        onOk={handleModalSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form
          form={modalForm}
          layout="vertical"
          initialValues={{
            status: 1
          }}
        >
          <Form.Item
            name="name"
            label="角色名称"
            rules={[{ required: true, message: "请输入角色名称" }]}
          >
            <Input placeholder="输入角色名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={4} placeholder="输入角色描述" />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: "请选择状态" }]}
          >
            <Checkbox checked={modalForm.getFieldValue('status') === 1} onChange={(e) => {
              modalForm.setFieldsValue({ status: e.target.checked ? 1 : 0 });
            }}>
              启用
            </Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      {/* 权限设置模态框 */}
      <Modal
        title={`设置权限: ${editingRole?.name}`}
        open={permissionModalVisible}
        onCancel={() => setPermissionModalVisible(false)}
        width={700}
        footer={[
          <Button key="cancel" onClick={() => setPermissionModalVisible(false)}>
            取消
          </Button>,
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSavePermissions}
          >
            保存
          </Button>
        ]}
      >
        <Tabs defaultActiveKey="tree">
          <TabPane tab="权限树" key="tree">
            <div className="p-4 bg-gray-50 rounded-lg max-h-96 overflow-auto">
              <Tree
                checkable
                showLine
                expandedKeys={expandedKeys}
                checkedKeys={checkedKeys}
                onCheck={handlePermissionCheck}
                onExpand={setExpandedKeys}
                treeData={permissionTree}
              />
            </div>
          </TabPane>
          <TabPane tab="权限列表" key="list">
            <div className="p-4 bg-gray-50 rounded-lg max-h-96 overflow-auto">
              {permissionTree.map(module => (
                <div key={module.key} className="mb-4">
                  <Divider orientation="left">{module.title}</Divider>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {module.children.map(perm => (
                      <Checkbox
                        key={perm.key}
                        checked={selectedPermissions.includes(perm.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPermissions([...selectedPermissions, perm.key]);
                            setCheckedKeys([...checkedKeys, perm.key]);
                          } else {
                            setSelectedPermissions(selectedPermissions.filter(p => p !== perm.key));
                            setCheckedKeys(checkedKeys.filter(k => k !== perm.key));
                          }
                        }}
                      >
                        {perm.title}
                      </Checkbox>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabPane>
        </Tabs>
      </Modal>
    </div>
  );
}
