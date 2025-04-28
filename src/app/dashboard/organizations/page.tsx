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
  Tree,
  Select
} from "antd";
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined, 
  ReloadOutlined,
  BranchesOutlined
} from "@ant-design/icons";
import axios from "axios";

const { Title } = Typography;
const { Option } = Select;
const { Search } = Input;

export default function OrganizationsPage() {
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [treeData, setTreeData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalForm] = Form.useForm();
  const [editingOrg, setEditingOrg] = useState(null);
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [treeModalVisible, setTreeModalVisible] = useState(false);

  // 获取组织列表
  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/organizations');
      
      if (data.success) {
        setOrganizations(data.data);
        
        // 构建树形结构数据
        const tree = buildTree(data.data);
        setTreeData(tree);
        
        // 默认展开一级节点
        const rootKeys = tree.map(node => node.key);
        setExpandedKeys(rootKeys);
      } else {
        message.error(data.message || "获取组织列表失败");
      }
    } catch (error) {
      console.error("获取组织列表错误:", error);
      message.error("获取组织列表失败");
    } finally {
      setLoading(false);
    }
  };

  // 构建树形结构
  const buildTree = (flatData) => {
    const map = {};
    const tree = [];
    
    // 创建节点映射
    flatData.forEach(item => {
      map[item.id] = {
        key: item.id.toString(),
        title: item.name,
        children: [],
        ...item
      };
    });
    
    // 构建树
    flatData.forEach(item => {
      if (item.parentId) {
        const parent = map[item.parentId];
        if (parent) {
          parent.children.push(map[item.id]);
        }
      } else {
        tree.push(map[item.id]);
      }
    });
    
    return tree;
  };

  // 首次加载
  useEffect(() => {
    fetchOrganizations();
  }, []);

  // 删除组织
  const handleDelete = async (id) => {
    try {
      const { data } = await axios.delete(`/api/organizations/${id}`);
      if (data.success) {
        message.success("删除成功");
        fetchOrganizations();
      } else {
        message.error(data.message || "删除失败");
      }
    } catch (error) {
      console.error("删除组织错误:", error);
      message.error("删除失败");
    }
  };

  // 打开编辑/创建模态框
  const openModal = (org = null) => {
    setEditingOrg(org);
    modalForm.resetFields();
    
    if (org) {
      modalForm.setFieldsValue(org);
    }
    
    setModalVisible(true);
  };

  // 提交表单
  const handleModalSubmit = async () => {
    try {
      const values = await modalForm.validateFields();
      
      if (editingOrg) {
        // 更新组织
        const { data } = await axios.put(`/api/organizations/${editingOrg.id}`, values);
        if (data.success) {
          message.success("更新组织成功");
          setModalVisible(false);
          fetchOrganizations();
        } else {
          message.error(data.message || "更新组织失败");
        }
      } else {
        // 创建组织
        const { data } = await axios.post('/api/organizations', values);
        if (data.success) {
          message.success("创建组织成功");
          setModalVisible(false);
          fetchOrganizations();
        } else {
          message.error(data.message || "创建组织失败");
        }
      }
    } catch (error) {
      console.error("提交表单错误:", error);
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
      title: "名称",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "上级组织",
      dataIndex: "parent",
      key: "parent",
      render: (parent) => parent?.name || "-",
    },
    {
      title: "层级",
      dataIndex: "level",
      key: "level",
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
      title: "操作",
      key: "action",
      width: 200,
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
          <Popconfirm
            title="确定要删除此组织吗?"
            description="删除组织将同时删除其下所有子组织，且无法恢复!"
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
        <Title level={2}>组织管理</Title>
        <Space>
          <Button 
            icon={<BranchesOutlined />}
            onClick={() => setTreeModalVisible(true)}
          >
            组织架构树
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => openModal()}
          >
            添加组织
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={organizations}
          rowKey="id"
          loading={loading}
        />
      </Card>

      {/* 组织编辑/创建模态框 */}
      <Modal
        title={editingOrg ? "编辑组织" : "创建组织"}
        open={modalVisible}
        onOk={handleModalSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form
          form={modalForm}
          layout="vertical"
          initialValues={{
            status: 1,
            level: 1
          }}
        >
          <Form.Item
            name="name"
            label="组织名称"
            rules={[{ required: true, message: "请输入组织名称" }]}
          >
            <Input placeholder="输入组织名称" />
          </Form.Item>

          <Form.Item
            name="parentId"
            label="上级组织"
          >
            <Select placeholder="选择上级组织" allowClear>
              {organizations.map(org => (
                <Option key={org.id} value={org.id}>{org.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="level"
            label="层级"
            rules={[{ required: true, message: "请输入层级" }]}
          >
            <Select placeholder="选择层级">
              <Option value={1}>1级</Option>
              <Option value={2}>2级</Option>
              <Option value={3}>3级</Option>
              <Option value={4}>4级</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={4} placeholder="输入组织描述" />
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
        </Form>
      </Modal>

      {/* 组织架构树模态框 */}
      <Modal
        title="组织架构树"
        open={treeModalVisible}
        onCancel={() => setTreeModalVisible(false)}
        footer={null}
        width={600}
      >
        <div className="p-4 bg-gray-50 rounded-lg">
          {treeData.length > 0 ? (
            <Tree
              showLine
              defaultExpandAll
              expandedKeys={expandedKeys}
              onExpand={setExpandedKeys}
              treeData={treeData}
            />
          ) : (
            <div className="text-center py-8">暂无组织数据</div>
          )}
        </div>
      </Modal>
    </div>
  );
}
