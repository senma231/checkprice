"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Form,
  Select,
  Input,
  Button,
  DatePicker,
  Table,
  Typography,
  Tag,
  Tabs,
  Space,
  Modal
} from "antd";
import {
  SearchOutlined,
  EyeOutlined,
  DownloadOutlined
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;
const { TextArea } = Input;

interface OperationLogData {
  id: number;
  userId: number | null;
  username: string | null;
  module: string;
  operation: string;
  method: string;
  requestUrl: string;
  requestParams: string | null;
  ipAddress: string | null;
  executionTime: number | null;
  status: number;
  errorMessage: string | null;
  createdAt: string;
}

interface QueryLogData {
  id: number;
  userId: number | null;
  username: string | null;
  userType: number;
  queryType: string;
  queryParams: string;
  resultCount: number | null;
  executionTime: number | null;
  ipAddress: string | null;
  createdAt: string;
}

export default function LogQueryPage() {
  const [operationForm] = Form.useForm();
  const [queryForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("operation");
  const [operationLogs, setOperationLogs] = useState<OperationLogData[]>([]);
  const [queryLogs, setQueryLogs] = useState<QueryLogData[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [logDetail, setLogDetail] = useState<any>(null);



  // 操作日志表格列
  const operationColumns: ColumnsType<OperationLogData> = [
    {
      title: "用户",
      dataIndex: "username",
      key: "username",
      render: (text) => text || "-",
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
      title: "方法",
      dataIndex: "method",
      key: "method",
      render: (text) => (
        <Tag color={
          text === "GET" ? "blue" :
          text === "POST" ? "green" :
          text === "PUT" ? "orange" :
          text === "DELETE" ? "red" : "default"
        }>
          {text}
        </Tag>
      ),
    },
    {
      title: "IP地址",
      dataIndex: "ipAddress",
      key: "ipAddress",
      render: (text) => text || "-",
    },
    {
      title: "执行时间",
      dataIndex: "executionTime",
      key: "executionTime",
      render: (text) => text ? `${text} ms` : "-",
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (text) => (
        <Tag color={text === 1 ? "green" : "red"}>
          {text === 1 ? "成功" : "失败"}
        </Tag>
      ),
    },
    {
      title: "操作时间",
      dataIndex: "createdAt",
      key: "createdAt",
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        />
      ),
    },
  ];

  // 查询日志表格列
  const queryColumns: ColumnsType<QueryLogData> = [
    {
      title: "用户",
      key: "user",
      render: (_, record) => (
        <span>
          {record.username || "匿名用户"}
          <Tag
            color={
              record.userType === 1 ? "blue" :
              record.userType === 2 ? "green" : "gray"
            }
            className="ml-2"
          >
            {record.userType === 1 ? "内部用户" :
             record.userType === 2 ? "外部用户" : "匿名用户"}
          </Tag>
        </span>
      )
    },
    {
      title: "查询类型",
      dataIndex: "queryType",
      key: "queryType",
      render: (text) => (
        <Tag color="purple">
          {text === "PRICE_QUERY" ? "价格查询" : text}
        </Tag>
      )
    },
    {
      title: "结果数",
      dataIndex: "resultCount",
      key: "resultCount",
      render: (text) => text || "-",
    },
    {
      title: "执行时间",
      dataIndex: "executionTime",
      key: "executionTime",
      render: (text) => text ? `${text} ms` : "-",
    },
    {
      title: "IP地址",
      dataIndex: "ipAddress",
      key: "ipAddress",
      render: (text) => text || "-",
    },
    {
      title: "查询时间",
      dataIndex: "createdAt",
      key: "createdAt",
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        />
      ),
    },
  ];

  // 处理查看详情
  const handleViewDetail = (record: any) => {
    setLogDetail(record);
    setIsModalVisible(true);
  };

  // 处理操作日志查询
  const handleOperationSearch = async (values: any) => {
    console.log("操作日志查询参数:", values);
    setLoading(true);

    try {
      // 构建查询参数
      const queryParams = new URLSearchParams();

      if (values.username) queryParams.append('username', values.username);
      if (values.module) queryParams.append('module', values.module);
      if (values.operation) queryParams.append('operation', values.operation);
      if (values.status !== undefined) queryParams.append('status', values.status);
      if (values.dateRange && values.dateRange[0] && values.dateRange[1]) {
        queryParams.append('startDate', values.dateRange[0].format('YYYY-MM-DD'));
        queryParams.append('endDate', values.dateRange[1].format('YYYY-MM-DD'));
      }

      const response = await fetch(`/api/logs/operations?${queryParams}`);
      const result = await response.json();

      if (result.success) {
        setOperationLogs(result.data.logs);
      } else {
        message.error(result.message || '获取操作日志失败');
      }
    } catch (error) {
      console.error('获取操作日志错误:', error);
      message.error('获取操作日志失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理查询日志查询
  const handleQuerySearch = async (values: any) => {
    console.log("查询日志查询参数:", values);
    setLoading(true);

    try {
      // 构建查询参数
      const queryParams = new URLSearchParams();

      if (values.username) queryParams.append('username', values.username);
      if (values.userType) queryParams.append('userType', values.userType);
      if (values.queryType) queryParams.append('queryType', values.queryType);
      if (values.dateRange && values.dateRange[0] && values.dateRange[1]) {
        queryParams.append('startDate', values.dateRange[0].format('YYYY-MM-DD'));
        queryParams.append('endDate', values.dateRange[1].format('YYYY-MM-DD'));
      }

      const response = await fetch(`/api/logs/queries?${queryParams}`);
      const result = await response.json();

      if (result.success) {
        setQueryLogs(result.data.logs);
      } else {
        message.error(result.message || '获取查询日志失败');
      }
    } catch (error) {
      console.error('获取查询日志错误:', error);
      message.error('获取查询日志失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理导出日志
  const handleExportLogs = () => {
    message.success("日志导出中...");
  };

  // 组件加载时获取数据
  useEffect(() => {
    if (activeTab === "operation") {
      handleOperationSearch({});
    } else {
      handleQuerySearch({});
    }
  }, [activeTab]);

  // 格式化JSON字符串
  const formatJSON = (jsonString: string | null) => {
    if (!jsonString) return "-";

    try {
      const obj = JSON.parse(jsonString);
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return jsonString;
    }
  };

  return (
    <div>
      <Title level={2}>日志查询</Title>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="操作日志" key="operation" />
        <TabPane tab="查询日志" key="query" />
      </Tabs>

      {activeTab === "operation" ? (
        <>
          <Card className="mb-6">
            <Form
              form={operationForm}
              onFinish={handleOperationSearch}
              layout="vertical"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Form.Item
                  name="username"
                  label="用户名"
                >
                  <Input placeholder="输入用户名" allowClear />
                </Form.Item>

                <Form.Item
                  name="module"
                  label="模块"
                >
                  <Select placeholder="选择模块" allowClear>
                    <Option value="用户管理">用户管理</Option>
                    <Option value="角色管理">角色管理</Option>
                    <Option value="组织管理">组织管理</Option>
                    <Option value="价格管理">价格管理</Option>
                    <Option value="系统管理">系统管理</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="operation"
                  label="操作"
                >
                  <Input placeholder="输入操作" allowClear />
                </Form.Item>

                <Form.Item
                  name="status"
                  label="状态"
                >
                  <Select placeholder="选择状态" allowClear>
                    <Option value={1}>成功</Option>
                    <Option value={0}>失败</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="dateRange"
                  label="日期范围"
                >
                  <RangePicker
                    format="YYYY-MM-DD"
                    style={{ width: "100%" }}
                  />
                </Form.Item>

                <Form.Item label=" " className="flex items-end">
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SearchOutlined />}
                      loading={loading}
                    >
                      查询
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={handleExportLogs}
                    >
                      导出
                    </Button>
                  </Space>
                </Form.Item>
              </div>
            </Form>
          </Card>

          <Card>
            <Table
              columns={operationColumns}
              dataSource={operationLogs}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </>
      ) : (
        <>
          <Card className="mb-6">
            <Form
              form={queryForm}
              onFinish={handleQuerySearch}
              layout="vertical"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Form.Item
                  name="username"
                  label="用户名"
                >
                  <Input placeholder="输入用户名" allowClear />
                </Form.Item>

                <Form.Item
                  name="userType"
                  label="用户类型"
                >
                  <Select placeholder="选择用户类型" allowClear>
                    <Option value={1}>内部用户</Option>
                    <Option value={2}>外部用户</Option>
                    <Option value={3}>匿名用户</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="queryType"
                  label="查询类型"
                >
                  <Select placeholder="选择查询类型" allowClear>
                    <Option value="PRICE_QUERY">价格查询</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="dateRange"
                  label="日期范围"
                >
                  <RangePicker
                    format="YYYY-MM-DD"
                    style={{ width: "100%" }}
                  />
                </Form.Item>

                <Form.Item label=" " className="flex items-end">
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SearchOutlined />}
                      loading={loading}
                    >
                      查询
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={handleExportLogs}
                    >
                      导出
                    </Button>
                  </Space>
                </Form.Item>
              </div>
            </Form>
          </Card>

          <Card>
            <Table
              columns={queryColumns}
              dataSource={queryLogs}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </>
      )}

      <Modal
        title="日志详情"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={700}
      >
        {logDetail && (
          <div>
            {activeTab === "operation" ? (
              <>
                <Paragraph>
                  <Text strong>用户：</Text> {logDetail.username || "匿名用户"}
                </Paragraph>
                <Paragraph>
                  <Text strong>模块：</Text> {logDetail.module}
                </Paragraph>
                <Paragraph>
                  <Text strong>操作：</Text> {logDetail.operation}
                </Paragraph>
                <Paragraph>
                  <Text strong>方法：</Text> {logDetail.method}
                </Paragraph>
                <Paragraph>
                  <Text strong>请求URL：</Text> {logDetail.requestUrl}
                </Paragraph>
                <Paragraph>
                  <Text strong>请求参数：</Text>
                </Paragraph>
                <div className="bg-gray-50 p-4 rounded mb-4">
                  <pre className="whitespace-pre-wrap">{formatJSON(logDetail.requestParams)}</pre>
                </div>
                <Paragraph>
                  <Text strong>IP地址：</Text> {logDetail.ipAddress || "-"}
                </Paragraph>
                <Paragraph>
                  <Text strong>执行时间：</Text> {logDetail.executionTime ? `${logDetail.executionTime} ms` : "-"}
                </Paragraph>
                <Paragraph>
                  <Text strong>状态：</Text>
                  <Tag color={logDetail.status === 1 ? "green" : "red"} className="ml-2">
                    {logDetail.status === 1 ? "成功" : "失败"}
                  </Tag>
                </Paragraph>
                {logDetail.errorMessage && (
                  <>
                    <Paragraph>
                      <Text strong>错误信息：</Text>
                    </Paragraph>
                    <div className="bg-red-50 p-4 rounded mb-4">
                      <pre className="whitespace-pre-wrap text-red-500">{logDetail.errorMessage}</pre>
                    </div>
                  </>
                )}
                <Paragraph>
                  <Text strong>操作时间：</Text> {logDetail.createdAt}
                </Paragraph>
              </>
            ) : (
              <>
                <Paragraph>
                  <Text strong>用户：</Text> {logDetail.username || "匿名用户"}
                  <Tag
                    color={
                      logDetail.userType === 1 ? "blue" :
                      logDetail.userType === 2 ? "green" : "gray"
                    }
                    className="ml-2"
                  >
                    {logDetail.userType === 1 ? "内部用户" :
                     logDetail.userType === 2 ? "外部用户" : "匿名用户"}
                  </Tag>
                </Paragraph>
                <Paragraph>
                  <Text strong>查询类型：</Text>
                  <Tag color="purple" className="ml-2">
                    {logDetail.queryType === "PRICE_QUERY" ? "价格查询" : logDetail.queryType}
                  </Tag>
                </Paragraph>
                <Paragraph>
                  <Text strong>查询参数：</Text>
                </Paragraph>
                <div className="bg-gray-50 p-4 rounded mb-4">
                  <pre className="whitespace-pre-wrap">{formatJSON(logDetail.queryParams)}</pre>
                </div>
                <Paragraph>
                  <Text strong>结果数：</Text> {logDetail.resultCount || "-"}
                </Paragraph>
                <Paragraph>
                  <Text strong>执行时间：</Text> {logDetail.executionTime ? `${logDetail.executionTime} ms` : "-"}
                </Paragraph>
                <Paragraph>
                  <Text strong>IP地址：</Text> {logDetail.ipAddress || "-"}
                </Paragraph>
                <Paragraph>
                  <Text strong>查询时间：</Text> {logDetail.createdAt}
                </Paragraph>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
