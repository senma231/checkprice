"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  Button, 
  Typography, 
  DatePicker, 
  Space, 
  Radio, 
  Spin, 
  Empty,
  Alert,
  Tabs,
  Table,
  Tag,
  Statistic,
  Row,
  Col
} from "antd";
import { 
  DownloadOutlined, 
  SearchOutlined, 
  ReloadOutlined,
  UserOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  FileSearchOutlined
} from "@ant-design/icons";
import axios from "axios";
import ReactECharts from "echarts-for-react";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

export default function QueryStatsPage() {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([]);
  const [chartType, setChartType] = useState("bar");
  const [timeUnit, setTimeUnit] = useState("day");
  const [statsData, setStatsData] = useState(null);
  const [topQueries, setTopQueries] = useState([]);
  const [summaryData, setSummaryData] = useState({
    totalQueries: 0,
    avgResponseTime: 0,
    successRate: 0,
    uniqueUsers: 0
  });

  // 获取查询统计数据
  const fetchQueryStats = async () => {
    if (!dateRange || dateRange.length !== 2) {
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post('/api/reports/query-stats', {
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        timeUnit
      });
      
      if (data.success) {
        setStatsData(data.data.stats);
        setTopQueries(data.data.topQueries);
        setSummaryData(data.data.summary);
      } else {
        message.error(data.message || "获取查询统计失败");
      }
    } catch (error) {
      console.error("获取查询统计错误:", error);
    } finally {
      setLoading(false);
    }
  };

  // 处理日期范围变化
  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  // 处理时间单位变化
  const handleTimeUnitChange = (e) => {
    setTimeUnit(e.target.value);
  };

  // 处理图表类型变化
  const handleChartTypeChange = (e) => {
    setChartType(e.target.value);
  };

  // 搜索
  const handleSearch = () => {
    fetchQueryStats();
  };

  // 重置
  const handleReset = () => {
    setDateRange([]);
    setTimeUnit("day");
    setChartType("bar");
    setStatsData(null);
    setTopQueries([]);
  };

  // 导出报表
  const handleExport = () => {
    // 实际项目中应该调用API导出报表
    alert("导出功能开发中...");
  };

  // 生成查询量图表选项
  const getQueryCountChartOption = () => {
    if (!statsData || !statsData.dates || statsData.dates.length === 0) {
      return {};
    }

    return {
      title: {
        text: '查询量统计',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: statsData.dates,
        axisLabel: {
          rotate: 45
        }
      },
      yAxis: {
        type: 'value',
        name: '查询次数'
      },
      series: [
        {
          name: '查询次数',
          type: chartType,
          data: statsData.counts,
          itemStyle: {
            color: '#1890ff'
          }
        }
      ]
    };
  };

  // 生成响应时间图表选项
  const getResponseTimeChartOption = () => {
    if (!statsData || !statsData.dates || statsData.dates.length === 0) {
      return {};
    }

    return {
      title: {
        text: '平均响应时间统计',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: statsData.dates,
        axisLabel: {
          rotate: 45
        }
      },
      yAxis: {
        type: 'value',
        name: '响应时间(ms)'
      },
      series: [
        {
          name: '平均响应时间',
          type: 'line',
          data: statsData.responseTimes,
          itemStyle: {
            color: '#52c41a'
          },
          smooth: true
        }
      ]
    };
  };

  // 生成查询类型分布图表选项
  const getQueryTypeChartOption = () => {
    if (!statsData || !statsData.queryTypes || Object.keys(statsData.queryTypes).length === 0) {
      return {};
    }

    const data = Object.keys(statsData.queryTypes).map(key => ({
      name: key,
      value: statsData.queryTypes[key]
    }));

    return {
      title: {
        text: '查询类型分布',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        data: data.map(item => item.name)
      },
      series: [
        {
          name: '查询类型',
          type: 'pie',
          radius: ['50%', '70%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '18',
              fontWeight: 'bold'
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

  // 热门查询表格列
  const topQueriesColumns = [
    {
      title: "排名",
      key: "rank",
      render: (_, __, index) => index + 1,
      width: 80
    },
    {
      title: "查询类型",
      dataIndex: "queryType",
      key: "queryType",
      render: (type) => (
        <Tag color="blue">{type}</Tag>
      )
    },
    {
      title: "查询参数",
      dataIndex: "queryParams",
      key: "queryParams",
      ellipsis: true,
      render: (params) => {
        try {
          const paramsObj = JSON.parse(params);
          return Object.entries(paramsObj)
            .filter(([key, value]) => value !== undefined && value !== null && value !== '')
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
        } catch (e) {
          return params;
        }
      }
    },
    {
      title: "查询次数",
      dataIndex: "count",
      key: "count",
      sorter: (a, b) => a.count - b.count,
      defaultSortOrder: 'descend'
    },
    {
      title: "平均响应时间",
      dataIndex: "avgResponseTime",
      key: "avgResponseTime",
      render: (time) => `${time} ms`,
      sorter: (a, b) => a.avgResponseTime - b.avgResponseTime
    }
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Title level={2}>查询统计</Title>
        <Button 
          icon={<DownloadOutlined />}
          onClick={handleExport}
        >
          导出报表
        </Button>
      </div>

      <Card className="mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <Text strong>日期范围</Text>
            <div className="mt-2">
              <RangePicker 
                value={dateRange} 
                onChange={handleDateRangeChange} 
                style={{ width: 280 }}
              />
            </div>
          </div>
          <div>
            <Text strong>时间单位</Text>
            <div className="mt-2">
              <Radio.Group value={timeUnit} onChange={handleTimeUnitChange}>
                <Radio.Button value="hour">小时</Radio.Button>
                <Radio.Button value="day">天</Radio.Button>
                <Radio.Button value="week">周</Radio.Button>
                <Radio.Button value="month">月</Radio.Button>
              </Radio.Group>
            </div>
          </div>
          <div>
            <Text strong>图表类型</Text>
            <div className="mt-2">
              <Radio.Group value={chartType} onChange={handleChartTypeChange}>
                <Radio.Button value="bar">柱状图</Radio.Button>
                <Radio.Button value="line">折线图</Radio.Button>
              </Radio.Group>
            </div>
          </div>
          <div>
            <Space>
              <Button 
                type="primary" 
                icon={<SearchOutlined />} 
                onClick={handleSearch}
                disabled={!dateRange || dateRange.length !== 2}
              >
                查询
              </Button>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleReset}
              >
                重置
              </Button>
            </Space>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spin size="large" tip="加载中..." />
        </div>
      ) : statsData ? (
        <>
          <Row gutter={16} className="mb-6">
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="总查询次数"
                  value={summaryData.totalQueries}
                  prefix={<FileSearchOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="平均响应时间"
                  value={summaryData.avgResponseTime}
                  suffix="ms"
                  prefix={<ClockCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="查询成功率"
                  value={summaryData.successRate}
                  suffix="%"
                  precision={2}
                  valueStyle={{ color: summaryData.successRate > 90 ? '#3f8600' : '#cf1322' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="独立用户数"
                  value={summaryData.uniqueUsers}
                  prefix={<UserOutlined />}
                />
              </Card>
            </Col>
          </Row>

          <Tabs defaultActiveKey="queryCount" className="mb-6">
            <TabPane tab="查询量统计" key="queryCount">
              <Card>
                <ReactECharts 
                  option={getQueryCountChartOption()} 
                  style={{ height: 400 }}
                  notMerge={true}
                />
              </Card>
            </TabPane>
            <TabPane tab="响应时间统计" key="responseTime">
              <Card>
                <ReactECharts 
                  option={getResponseTimeChartOption()} 
                  style={{ height: 400 }}
                  notMerge={true}
                />
              </Card>
            </TabPane>
            <TabPane tab="查询类型分布" key="queryType">
              <Card>
                <ReactECharts 
                  option={getQueryTypeChartOption()} 
                  style={{ height: 400 }}
                  notMerge={true}
                />
              </Card>
            </TabPane>
          </Tabs>

          <Card title="热门查询TOP 10">
            <Table
              columns={topQueriesColumns}
              dataSource={topQueries}
              rowKey="id"
              pagination={false}
            />
          </Card>
        </>
      ) : (
        <Card>
          <div className="flex justify-center items-center h-64">
            <Alert
              message="请选择日期范围"
              description="选择日期范围并点击查询按钮获取统计数据"
              type="info"
              showIcon
            />
          </div>
        </Card>
      )}
    </div>
  );
}
