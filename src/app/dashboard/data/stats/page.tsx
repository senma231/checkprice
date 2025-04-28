"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Form,
  Select,
  Button,
  DatePicker,
  Typography,
  Spin,
  Empty,
  Radio,
  Tabs,
  Table,
  Tag,
  message
} from "antd";
import { SearchOutlined } from "@ant-design/icons";
import dynamic from "next/dynamic";
import type { ColumnsType } from "antd/es/table";

// 动态导入ECharts组件，避免SSR问题
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface QueryLogData {
  id: number;
  userId: number | null;
  username: string | null;
  userType: number;
  queryType: string;
  queryParams: string;
  resultCount: number;
  executionTime: number;
  ipAddress: string;
  createdAt: string;
}

export default function QueryStatsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<any>(null);
  const [chartType, setChartType] = useState<string>("bar");
  const [activeTab, setActiveTab] = useState<string>("chart");
  const [queryLogs, setQueryLogs] = useState<QueryLogData[]>([]);

  // 模拟数据
  const mockQueryStats = {
    dates: [
      "2025-04-01", "2025-04-02", "2025-04-03", "2025-04-04", "2025-04-05",
      "2025-04-06", "2025-04-07", "2025-04-08", "2025-04-09", "2025-04-10"
    ],
    series: [
      {
        name: "传统物流查询",
        data: [42, 35, 48, 53, 41, 37, 45, 52, 49, 56]
      },
      {
        name: "FBA头程查询",
        data: [28, 32, 25, 30, 35, 29, 33, 38, 31, 36]
      },
      {
        name: "增值服务查询",
        data: [15, 18, 12, 16, 20, 14, 17, 22, 19, 24]
      }
    ],
    pieData: [
      { value: 456, name: "传统物流查询" },
      { value: 317, name: "FBA头程查询" },
      { value: 177, name: "增值服务查询" }
    ],
    userTypeData: [
      { value: 320, name: "内部用户" },
      { value: 480, name: "外部用户" },
      { value: 150, name: "匿名用户" }
    ]
  };

  // 模拟查询日志数据
  const mockQueryLogs: QueryLogData[] = [
    {
      id: 1,
      userId: 1,
      username: "admin",
      userType: 1,
      queryType: "PRICE_QUERY",
      queryParams: '{"serviceType":1,"originRegionId":7,"destinationRegionId":16,"weight":100}',
      resultCount: 5,
      executionTime: 120,
      ipAddress: "192.168.1.1",
      createdAt: "2025-04-10 10:30:45"
    },
    {
      id: 2,
      userId: 2,
      username: "manager",
      userType: 1,
      queryType: "PRICE_QUERY",
      queryParams: '{"serviceType":2,"originRegionId":7,"destinationRegionId":14,"weight":50}',
      resultCount: 3,
      executionTime: 95,
      ipAddress: "192.168.1.2",
      createdAt: "2025-04-10 11:15:22"
    },
    {
      id: 3,
      userId: 4,
      username: "customer",
      userType: 2,
      queryType: "PRICE_QUERY",
      queryParams: '{"serviceType":1,"originRegionId":7,"destinationRegionId":13,"weight":200}',
      resultCount: 4,
      executionTime: 110,
      ipAddress: "192.168.1.3",
      createdAt: "2025-04-10 13:45:10"
    },
    {
      id: 4,
      userId: null,
      username: null,
      userType: 3,
      queryType: "PRICE_QUERY",
      queryParams: '{"serviceType":3,"serviceId":5}',
      resultCount: 1,
      executionTime: 85,
      ipAddress: "192.168.1.4",
      createdAt: "2025-04-10 14:20:35"
    },
    {
      id: 5,
      userId: 3,
      username: "staff",
      userType: 1,
      queryType: "PRICE_QUERY",
      queryParams: '{"serviceType":2,"originRegionId":7,"destinationRegionId":16,"weight":150}',
      resultCount: 2,
      executionTime: 105,
      ipAddress: "192.168.1.5",
      createdAt: "2025-04-10 15:10:18"
    }
  ];

  // 查询日志表格列
  const columns: ColumnsType<QueryLogData> = [
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
      title: "查询参数",
      dataIndex: "queryParams",
      key: "queryParams",
      render: (text) => {
        try {
          const params = JSON.parse(text);
          return (
            <div className="text-xs">
              {Object.entries(params).map(([key, value]) => (
                <div key={key}>{key}: {String(value)}</div>
              ))}
            </div>
          );
        } catch (e) {
          return text;
        }
      }
    },
    {
      title: "结果数",
      dataIndex: "resultCount",
      key: "resultCount",
    },
    {
      title: "执行时间",
      dataIndex: "executionTime",
      key: "executionTime",
      render: (text) => `${text} ms`
    },
    {
      title: "IP地址",
      dataIndex: "ipAddress",
      key: "ipAddress",
    },
    {
      title: "查询时间",
      dataIndex: "createdAt",
      key: "createdAt",
    }
  ];

  // 处理查询
  const handleSearch = async (values: any) => {
    console.log("查询参数:", values);
    setLoading(true);

    try {
      // 处理日期范围
      let dateRange = null;
      if (values.dateRange && values.dateRange.length === 2) {
        dateRange = [
          values.dateRange[0].format('YYYY-MM-DD'),
          values.dateRange[1].format('YYYY-MM-DD')
        ];
      }

      // 构建查询参数
      const queryParams = {
        queryType: values.queryType,
        userType: values.userType,
        dateRange
      };

      // 发送API请求
      const response = await fetch('/api/data/query-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(queryParams),
      });

      const result = await response.json();

      if (result.success) {
        setChartData({
          dates: result.data.dates,
          series: result.data.series,
          pieData: result.data.pieData,
          userTypeData: result.data.userTypeData
        });
        setQueryLogs(result.data.logs);
      } else {
        message.error(result.message || "获取查询统计数据失败");
        // 使用模拟数据作为备选
        setChartData(mockQueryStats);
        setQueryLogs(mockQueryLogs);
      }
    } catch (error) {
      console.error('获取查询统计数据错误:', error);
      message.error('获取查询统计数据失败，请稍后重试');
      // 使用模拟数据作为备选
      setChartData(mockQueryStats);
      setQueryLogs(mockQueryLogs);
    } finally {
      setLoading(false);
    }
  };

  // 获取柱状图/折线图配置
  const getChartOption = () => {
    if (!chartData) return {};

    return {
      title: {
        text: "查询统计分析",
        left: "center"
      },
      tooltip: {
        trigger: "axis"
      },
      legend: {
        data: chartData.series.map((item: any) => item.name),
        bottom: 0
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "10%",
        containLabel: true
      },
      toolbox: {
        feature: {
          saveAsImage: {}
        }
      },
      xAxis: {
        type: "category",
        boundaryGap: chartType !== "line",
        data: chartData.dates
      },
      yAxis: {
        type: "value",
        name: "查询次数"
      },
      series: chartData.series.map((item: any) => ({
        name: item.name,
        type: chartType,
        data: item.data,
        smooth: true
      }))
    };
  };

  // 获取饼图配置
  const getPieOption = (data: any[], title: string) => {
    return {
      title: {
        text: title,
        left: "center"
      },
      tooltip: {
        trigger: "item",
        formatter: "{a} <br/>{b}: {c} ({d}%)"
      },
      legend: {
        orient: "vertical",
        left: 10,
        data: data.map(item => item.name)
      },
      series: [
        {
          name: "查询分布",
          type: "pie",
          radius: ["40%", "70%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: "#fff",
            borderWidth: 2
          },
          label: {
            show: false,
            position: "center"
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: "bold"
            }
          },
          labelLine: {
            show: false
          },
          data: data
        }
      ]
    };
  };

  // 组件加载时获取数据
  useEffect(() => {
    handleSearch({});
  }, []);

  return (
    <div>
      <Title level={2}>查询统计</Title>

      <Card className="mb-6">
        <Form
          form={form}
          onFinish={handleSearch}
          layout="vertical"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Form.Item
              name="queryType"
              label="查询类型"
            >
              <Select placeholder="选择查询类型" allowClear>
                <Option value="PRICE_QUERY">价格查询</Option>
                <Option value="HISTORY_QUERY">历史价格查询</Option>
              </Select>
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
              name="dateRange"
              label="日期范围"
            >
              <RangePicker
                format="YYYY-MM-DD"
                style={{ width: "100%" }}
              />
            </Form.Item>

            <Form.Item label=" " className="flex items-end">
              <Button
                type="primary"
                htmlType="submit"
                icon={<SearchOutlined />}
                loading={loading}
              >
                查询
              </Button>
            </Form.Item>
          </div>
        </Form>
      </Card>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'chart', label: '图表分析' },
            { key: 'logs', label: '查询记录' }
          ]}
        />

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Spin size="large" />
          </div>
        ) : activeTab === "chart" ? (
          chartData ? (
            <div>
              <div className="mb-4 flex justify-end">
                <Radio.Group
                  value={chartType}
                  onChange={e => setChartType(e.target.value)}
                  buttonStyle="solid"
                >
                  <Radio.Button value="bar">柱状图</Radio.Button>
                  <Radio.Button value="line">折线图</Radio.Button>
                </Radio.Group>
              </div>

              <div style={{ height: "400px" }} className="mb-6">
                <ReactECharts
                  option={getChartOption()}
                  style={{ height: "100%" }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div style={{ height: "400px" }}>
                  <ReactECharts
                    option={getPieOption(chartData.pieData, "查询类型分布")}
                    style={{ height: "100%" }}
                  />
                </div>
                <div style={{ height: "400px" }}>
                  <ReactECharts
                    option={getPieOption(chartData.userTypeData, "用户类型分布")}
                    style={{ height: "100%" }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <Empty
              description="暂无数据，请选择查询条件"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              className="py-20"
            />
          )
        ) : (
          <Table
            columns={columns}
            dataSource={queryLogs}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>
    </div>
  );
}
