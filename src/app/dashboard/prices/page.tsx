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
  DatePicker,
  Form
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  UploadOutlined
} from "@ant-design/icons";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function PricesPage() {
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [searchForm] = Form.useForm();
  const router = useRouter();

  // 获取价格列表
  const fetchPrices = async (params = {}) => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/prices', {
        params: {
          ...params,
          page: params.current || pagination.current,
          pageSize: params.pageSize || pagination.pageSize
        }
      });

      if (data.success) {
        setPrices(data.data.prices);
        setPagination({
          ...pagination,
          current: data.data.pagination.current,
          total: data.data.pagination.total
        });
      } else {
        message.error(data.message || "获取价格列表失败");
      }
    } catch (error) {
      console.error("获取价格列表错误:", error);
      message.error("获取价格列表失败");
    } finally {
      setLoading(false);
    }
  };

  // 首次加载
  useEffect(() => {
    fetchPrices();
  }, []);

  // 表格变化处理
  const handleTableChange = (pagination) => {
    fetchPrices({ current: pagination.current });
  };

  // 删除价格
  const handleDelete = async (id) => {
    try {
      const { data } = await axios.delete(`/api/prices/${id}`);
      if (data.success) {
        message.success("删除成功");
        fetchPrices();
      } else {
        message.error(data.message || "删除失败");
      }
    } catch (error) {
      console.error("删除价格错误:", error);
      message.error("删除失败");
    }
  };

  // 搜索
  const handleSearch = (values) => {
    fetchPrices({ ...values, current: 1 });
  };

  // 重置搜索
  const handleReset = () => {
    searchForm.resetFields();
    fetchPrices({ current: 1 });
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
      title: "服务类型",
      dataIndex: "serviceType",
      key: "serviceType",
      width: 100,
      render: (serviceType) => (
        <Tag color={serviceType === 1 ? "blue" : "green"}>
          {serviceType === 1 ? "物流服务" : "增值服务"}
        </Tag>
      ),
    },
    {
      title: "价格类型",
      dataIndex: "priceType",
      key: "priceType",
      width: 100,
      render: (priceType) => (
        <Tag color={priceType === 1 ? "orange" : "purple"}>
          {priceType === 1 ? "对外价格" : "内部价格"}
        </Tag>
      ),
    },
    {
      title: "所属组织",
      dataIndex: "organization",
      key: "organization",
      width: 120,
      render: (org) => org?.name || "-",
    },
    {
      title: "始发地",
      dataIndex: "originRegion",
      key: "originRegion",
      width: 100,
      render: (region) => region?.name || "-",
    },
    {
      title: "目的地",
      dataIndex: "destinationRegion",
      key: "destinationRegion",
      width: 100,
      render: (region) => region?.name || "-",
    },
    {
      title: "重量范围(kg)",
      key: "weightRange",
      width: 120,
      render: (_, record) => (
        <span>
          {record.weightStart ? `${record.weightStart} - ${record.weightEnd || "∞"}` : "-"}
        </span>
      ),
    },
    {
      title: "价格",
      key: "priceInfo",
      width: 120,
      render: (_, record) => (
        <span>
          {record.price} {record.currency}/{record.priceUnit}
        </span>
      ),
    },
    {
      title: "生效日期",
      dataIndex: "effectiveDate",
      key: "effectiveDate",
      width: 100,
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "状态",
      dataIndex: "isCurrent",
      key: "isCurrent",
      width: 90,
      render: (isCurrent) => (
        <Tag color={isCurrent ? "green" : "red"}>
          {isCurrent ? "当前有效" : "已过期"}
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
            onClick={() => router.push(`/dashboard/prices/${record.id}`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此价格吗?"
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
        <Title level={2}>价格管理</Title>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push("/dashboard/prices/create")}
          >
            添加价格
          </Button>
          <Button
            icon={<UploadOutlined />}
            onClick={() => router.push("/dashboard/prices/import")}
          >
            导入价格
          </Button>
        </Space>
      </div>

      <Card className="mb-6">
        <Form
          form={searchForm}
          layout="inline"
          onFinish={handleSearch}
          className="w-full"
        >
          <Form.Item name="serviceType" label="服务类型">
            <Select style={{ width: 120 }} allowClear placeholder="服务类型">
              <Option value="1">物流服务</Option>
              <Option value="2">增值服务</Option>
            </Select>
          </Form.Item>
          <Form.Item name="priceType" label="价格类型">
            <Select style={{ width: 120 }} allowClear placeholder="价格类型">
              <Option value="1">对外价格</Option>
              <Option value="2">内部价格</Option>
            </Select>
          </Form.Item>
          <Form.Item name="organizationId" label="所属组织">
            <Select style={{ width: 120 }} allowClear placeholder="所属组织">
              {/* 这里应该从API获取组织列表 */}
              <Option value="1">总公司</Option>
              <Option value="2">北京分公司</Option>
              <Option value="3">上海分公司</Option>
            </Select>
          </Form.Item>
          <Form.Item name="originRegionId" label="始发地">
            <Select style={{ width: 120 }} allowClear placeholder="始发地">
              <Option value="1">中国</Option>
              <Option value="2">美国</Option>
              <Option value="3">英国</Option>
            </Select>
          </Form.Item>
          <Form.Item name="destinationRegionId" label="目的地">
            <Select style={{ width: 120 }} allowClear placeholder="目的地">
              <Option value="1">中国</Option>
              <Option value="2">美国</Option>
              <Option value="3">英国</Option>
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label="生效日期">
            <RangePicker />
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
          dataSource={prices}
          rowKey="id"
          pagination={pagination}
          loading={loading}
          onChange={handleTableChange}
        />
      </Card>
    </div>
  );
}
