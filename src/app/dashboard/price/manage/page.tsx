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
  DatePicker,
  message,
  Popconfirm,
  Tabs
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HistoryOutlined
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface PriceData {
  id: number;
  serviceType: string;
  serviceTypeId: number;
  serviceId: number;
  serviceName: string;
  provider: string;
  originRegionId: number | null;
  originRegion: string;
  destinationRegionId: number | null;
  destinationRegion: string;
  weightStart: number | null;
  weightEnd: number | null;
  volumeStart: number | null;
  volumeEnd: number | null;
  price: number;
  currency: string;
  priceUnit: string;
  effectiveDate: string;
  expiryDate: string | null;
  isCurrent: boolean;
}

export default function PriceManagePage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PriceData[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPrice, setEditingPrice] = useState<PriceData | null>(null);
  const [activeTab, setActiveTab] = useState("traditional");



  const columns: ColumnsType<PriceData> = [
    {
      title: "服务名称",
      dataIndex: "serviceName",
      key: "serviceName",
    },
    {
      title: "服务商",
      dataIndex: "provider",
      key: "provider",
    },
    {
      title: "始发地",
      dataIndex: "originRegion",
      key: "originRegion",
    },
    {
      title: "目的地",
      dataIndex: "destinationRegion",
      key: "destinationRegion",
    },
    {
      title: "重量范围(kg)",
      key: "weight",
      render: (_, record) =>
        record.weightStart !== null && record.weightEnd !== null
          ? `${record.weightStart}-${record.weightEnd}`
          : "-",
    },
    {
      title: "体积范围(m³)",
      key: "volume",
      render: (_, record) =>
        record.volumeStart !== null && record.volumeEnd !== null
          ? `${record.volumeStart}-${record.volumeEnd}`
          : "-",
    },
    {
      title: "价格",
      dataIndex: "price",
      key: "price",
      render: (text, record) => `${text} ${record.currency}/${record.priceUnit}`,
    },
    {
      title: "有效期",
      key: "effectiveDate",
      render: (_, record) => `${record.effectiveDate} 至 ${record.expiryDate || "长期"}`,
    },
    {
      title: "状态",
      key: "status",
      render: (_, record) => (
        <Tag color={record.isCurrent ? "green" : "red"}>
          {record.isCurrent ? "生效中" : "已失效"}
        </Tag>
      ),
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
          <Popconfirm
            title="确定要删除此价格吗？"
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
            icon={<HistoryOutlined />}
            onClick={() => handleViewHistory(record.id)}
          />
        </Space>
      ),
    },
  ];

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      // 构建查询参数
      const serviceType = activeTab === "traditional" ? 1 : activeTab === "fba" ? 2 : activeTab === "valueAdded" ? 3 : null;

      // 发送API请求
      const response = await fetch(`/api/prices?serviceType=${serviceType || ''}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data.prices);
      } else {
        message.error(result.message || "获取价格数据失败");
      }
    } catch (error) {
      console.error('加载价格数据错误:', error);
      message.error('加载价格数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 组件加载时获取数据
  useEffect(() => {
    loadData();
  }, [activeTab]);

  // 处理标签页切换
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    // loadData会在useEffect中自动调用
  };

  // 处理添加价格
  const handleAdd = () => {
    setEditingPrice(null);
    form.resetFields();

    // 设置默认值
    form.setFieldsValue({
      serviceType: activeTab === "traditional" ? 1 : activeTab === "fba" ? 2 : 3,
      currency: "CNY",
      isCurrent: true,
    });

    setIsModalVisible(true);
  };

  // 处理编辑价格
  const handleEdit = (record: PriceData) => {
    setEditingPrice(record);
    form.setFieldsValue({
      ...record,
      effectiveDateRange: record.expiryDate
        ? [dayjs(record.effectiveDate), dayjs(record.expiryDate)]
        : [dayjs(record.effectiveDate), null],
    });
    setIsModalVisible(true);
  };

  // 处理删除价格
  const handleDelete = async (id: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/prices/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        message.success("价格删除成功");
        loadData(); // 重新加载数据
      } else {
        message.error(result.message || "价格删除失败");
      }
    } catch (error) {
      console.error('删除价格错误:', error);
      message.error('删除失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理查看历史记录
  const handleViewHistory = async (id: number) => {
    try {
      // 跳转到价格历史记录页面
      window.open(`/dashboard/price/history/${id}`, '_blank');
    } catch (error) {
      console.error('查看历史记录错误:', error);
      message.error('查看历史记录失败，请稍后重试');
    }
  };

  // 处理表单提交
  const handleSubmit = () => {
    form.validateFields().then(async values => {
      console.log("表单数据:", values);
      setLoading(true);

      try {
        // 处理日期范围
        const effectiveDate = values.effectiveDateRange[0].format("YYYY-MM-DD");
        const expiryDate = values.effectiveDateRange[1]
          ? values.effectiveDateRange[1].format("YYYY-MM-DD")
          : null;

        // 构建提交数据
        const submitData = {
          ...values,
          effectiveDate,
          expiryDate,
        };

        delete submitData.effectiveDateRange;

        if (editingPrice) {
          // 更新价格
          const response = await fetch(`/api/prices/${editingPrice.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(submitData),
          });

          const result = await response.json();

          if (result.success) {
            message.success("价格更新成功");
            loadData(); // 重新加载数据
            setIsModalVisible(false);
          } else {
            message.error(result.message || "价格更新失败");
          }
        } else {
          // 添加价格
          const response = await fetch('/api/prices', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(submitData),
          });

          const result = await response.json();

          if (result.success) {
            message.success("价格添加成功");
            loadData(); // 重新加载数据
            setIsModalVisible(false);
          } else {
            message.error(result.message || "价格添加失败");
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
      <Title level={2}>价格管理</Title>

      <Card>
        <div className="flex justify-between mb-4">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            添加价格
          </Button>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            { key: 'traditional', label: '传统物流' },
            { key: 'fba', label: 'FBA头程物流' },
            { key: 'valueAdded', label: '增值服务' }
          ]}
        />

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingPrice ? "编辑价格" : "添加价格"}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loading}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="serviceType"
            label="服务类型"
            rules={[{ required: true, message: "请选择服务类型" }]}
          >
            <Select disabled={!!editingPrice}>
              <Option value={1}>传统物流</Option>
              <Option value={2}>FBA头程物流</Option>
              <Option value={3}>增值服务</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="serviceId"
            label="服务名称"
            rules={[{ required: true, message: "请选择服务名称" }]}
          >
            <Select>
              <Option value={1}>标准海运</Option>
              <Option value={2}>快速空运</Option>
              <Option value={3}>FBA海运头程</Option>
              <Option value={4}>FBA空运头程</Option>
              <Option value={5}>贴标服务</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="originRegionId"
            label="始发地"
            rules={[{ required: form.getFieldValue("serviceType") !== 3, message: "请选择始发地" }]}
          >
            <Select disabled={form.getFieldValue("serviceType") === 3}>
              <Option value={7}>中国</Option>
              <Option value={16}>美国</Option>
              <Option value={14}>英国</Option>
              <Option value={13}>德国</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="destinationRegionId"
            label="目的地"
            rules={[{ required: form.getFieldValue("serviceType") !== 3, message: "请选择目的地" }]}
          >
            <Select disabled={form.getFieldValue("serviceType") === 3}>
              <Option value={7}>中国</Option>
              <Option value={16}>美国</Option>
              <Option value={14}>英国</Option>
              <Option value={13}>德国</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="effectiveDateRange"
            label="有效期"
            rules={[{ required: true, message: "请选择有效期" }]}
          >
            <RangePicker
              format="YYYY-MM-DD"
              allowEmpty={[false, true]}
            />
          </Form.Item>

          <Form.Item
            name="price"
            label="价格"
            rules={[{ required: true, message: "请输入价格" }]}
          >
            <Input type="number" min={0} step={0.01} />
          </Form.Item>

          <Form.Item
            name="currency"
            label="货币"
            rules={[{ required: true, message: "请选择货币" }]}
          >
            <Select>
              <Option value="CNY">人民币(CNY)</Option>
              <Option value="USD">美元(USD)</Option>
              <Option value="EUR">欧元(EUR)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="priceUnit"
            label="计价单位"
            rules={[{ required: true, message: "请选择计价单位" }]}
          >
            <Select>
              <Option value="kg">千克(kg)</Option>
              <Option value="m3">立方米(m³)</Option>
              <Option value="件">件</Option>
              <Option value="票">票</Option>
            </Select>
          </Form.Item>

          {form.getFieldValue("serviceType") !== 3 && (
            <>
              <Form.Item
                name="weightStart"
                label="重量下限(kg)"
              >
                <Input type="number" min={0} />
              </Form.Item>

              <Form.Item
                name="weightEnd"
                label="重量上限(kg)"
              >
                <Input type="number" min={0} />
              </Form.Item>

              <Form.Item
                name="volumeStart"
                label="体积下限(m³)"
              >
                <Input type="number" min={0} step={0.01} />
              </Form.Item>

              <Form.Item
                name="volumeEnd"
                label="体积上限(m³)"
              >
                <Input type="number" min={0} step={0.01} />
              </Form.Item>
            </>
          )}

          <Form.Item
            name="isCurrent"
            label="状态"
            valuePropName="checked"
          >
            <Select>
              <Option value={true}>生效中</Option>
              <Option value={false}>已失效</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
