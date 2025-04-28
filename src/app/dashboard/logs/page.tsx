"use client";

import { useState, useEffect } from "react";
import {
  Table,
  Card,
  Space,
  Typography,
  Tag,
  Input,
  Select,
  DatePicker,
  Form,
  Button,
  App
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined
} from "@ant-design/icons";
import axios from "axios";

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function LogsPage() {
  const { message } = App.useApp(); // 使用 App.useApp() 钩子获取 message 实例
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [searchForm] = Form.useForm();

  // 获取日志列表
  const fetchLogs = async (params = {}) => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/logs', {
        params: {
          ...params,
          page: params.current || pagination.current,
          pageSize: params.pageSize || pagination.pageSize
        }
      });

      if (data.success) {
        setLogs(data.data.logs);
        setPagination({
          ...pagination,
          current: data.data.pagination.current,
          total: data.data.pagination.total
        });
      } else {
        message.error(data.message || "获取日志列表失败");
      }
    } catch (error) {
      console.error("获取日志列表错误:", error);
      message.error("获取日志列表失败，请检查控制台错误信息");

      // 设置默认日志数据，以便在API失败时仍能显示界面
      setLogs([
        {
          id: 1,
          userId: 1,
          user: {
            id: 1,
            username: "admin",
            realName: "系统管理员"
          },
          module: "系统管理",
          operation: "系统初始化",
          method: "GET",
          requestUrl: "/api/system/init",
          requestParams: null,
          ipAddress: "127.0.0.1",
          executionTime: 100,
          status: 1,
          errorMessage: null,
          createdAt: new Date()
        }
      ]);
      setPagination({
        ...pagination,
        current: 1,
        total: 1
      });
    } finally {
      setLoading(false);
    }
  };

  // 首次加载
  useEffect(() => {
    fetchLogs();
  }, []);

  // 表格变化处理
  const handleTableChange = (pagination) => {
    fetchLogs({ current: pagination.current });
  };

  // 搜索
  const handleSearch = (values) => {
    const params = { ...values, current: 1 };

    // 处理日期范围
    if (values.dateRange) {
      params.startDate = values.dateRange[0].format('YYYY-MM-DD');
      params.endDate = values.dateRange[1].format('YYYY-MM-DD');
      delete params.dateRange;
    }

    fetchLogs(params);
  };

  // 重置搜索
  const handleReset = () => {
    searchForm.resetFields();
    fetchLogs({ current: 1 });
  };

  // 导出日志
  const handleExport = () => {
    message.info("导出功能开发中...");
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
      title: "用户",
      dataIndex: "user",
      key: "user",
      render: (user) => user?.username || "-",
    },
    {
      title: "模块",
      dataIndex: "module",
      key: "module",
    },
    {
      title: "操作",
      dataIndex: "operation",
      key: "operation",
    },
    {
      title: "请求方法",
      dataIndex: "method",
      key: "method",
      render: (method) => (
        <Tag color={
          method === 'GET' ? 'blue' :
          method === 'POST' ? 'green' :
          method === 'PUT' ? 'orange' :
          method === 'DELETE' ? 'red' : 'default'
        }>
          {method}
        </Tag>
      ),
    },
    {
      title: "IP地址",
      dataIndex: "ipAddress",
      key: "ipAddress",
    },
    {
      title: "执行时间(ms)",
      dataIndex: "executionTime",
      key: "executionTime",
      render: (time) => time || "-",
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === 1 ? "success" : "error"}>
          {status === 1 ? "成功" : "失败"}
        </Tag>
      ),
    },
    {
      title: "操作时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (time) => new Date(time).toLocaleString(),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Title level={2}>操作日志</Title>
        <Button
          icon={<ExportOutlined />}
          onClick={handleExport}
        >
          导出日志
        </Button>
      </div>

      <Card className="mb-6">
        <Form
          form={searchForm}
          layout="inline"
          onFinish={handleSearch}
          className="w-full"
        >
          <Form.Item name="module" label="模块">
            <Select style={{ width: 150 }} allowClear placeholder="选择模块">
              <Option value="价格管理">价格管理</Option>
              <Option value="用户管理">用户管理</Option>
              <Option value="系统管理">系统管理</Option>
            </Select>
          </Form.Item>
          <Form.Item name="operation" label="操作">
            <Input placeholder="输入操作" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select style={{ width: 150 }} allowClear placeholder="选择状态">
              <Option value="1">成功</Option>
              <Option value="0">失败</Option>
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label="操作时间">
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
          dataSource={logs}
          rowKey="id"
          pagination={pagination}
          loading={loading}
          onChange={handleTableChange}
          expandable={{
            expandedRowRender: (record) => (
              <div>
                <p><strong>请求URL:</strong> {record.requestUrl}</p>
                {record.requestParams && (
                  <p><strong>请求参数:</strong> {record.requestParams}</p>
                )}
                {record.errorMessage && (
                  <p><strong>错误信息:</strong> {record.errorMessage}</p>
                )}
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
}
