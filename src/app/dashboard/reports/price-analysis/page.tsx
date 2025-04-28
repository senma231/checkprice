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
  Select,
  Form,
  Row,
  Col,
  Table,
  Tag
} from "antd";
import { 
  DownloadOutlined, 
  SearchOutlined, 
  ReloadOutlined,
  RiseOutlined,
  FallOutlined
} from "@ant-design/icons";
import axios from "axios";
import ReactECharts from "echarts-for-react";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;
const { Option } = Select;

export default function PriceAnalysisPage() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [chartType, setChartType] = useState("line");
  const [analysisData, setAnalysisData] = useState(null);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [regions, setRegions] = useState([]);

  // 获取服务类型和区域数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取服务类型
        const serviceTypesResponse = await axios.get('/api/data/service-types');
        if (serviceTypesResponse.data.success) {
          setServiceTypes(serviceTypesResponse.data.data);
        }

        // 获取区域数据
        const regionsResponse = await axios.get('/api/data/regions');
        if (regionsResponse.data.success) {
          setRegions(regionsResponse.data.data);
        }
      } catch (error) {
        console.error("获取数据错误:", error);
      }
    };

    fetchData();
  }, []);

  // 获取价格分析数据
  const fetchPriceAnalysis = async (values) => {
    setLoading(true);
    try {
      const { data } = await axios.post('/api/reports/price-analysis', {
        ...values,
        dateRange: values.dateRange ? [
          values.dateRange[0].format('YYYY-MM-DD'),
          values.dateRange[1].format('YYYY-MM-DD')
        ] : undefined
      });
      
      if (data.success) {
        setAnalysisData(data.data);
      } else {
        message.error(data.message || "获取价格分析失败");
      }
    } catch (error) {
      console.error("获取价格分析错误:", error);
    } finally {
      setLoading(false);
    }
  };

  // 处理图表类型变化
  const handleChartTypeChange = (e) => {
    setChartType(e.target.value);
  };

  // 搜索
  const handleSearch = () => {
    form.validateFields().then(values => {
      fetchPriceAnalysis(values);
    });
  };

  // 重置
  const handleReset = () => {
    form.resetFields();
    setAnalysisData(null);
  };

  // 导出报表
  const handleExport = () => {
    // 实际项目中应该调用API导出报表
    alert("导出功能开发中...");
  };

  // 生成价格趋势图表选项
  const getPriceTrendChartOption = () => {
    if (!analysisData || !analysisData.trends || !analysisData.trends.dates || analysisData.trends.dates.length === 0) {
      return {};
    }

    return {
      title: {
        text: '价格趋势分析',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: analysisData.trends.series.map(s => s.name),
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: analysisData.trends.dates,
        axisLabel: {
          rotate: 45
        }
      },
      yAxis: {
        type: 'value',
        name: '价格'
      },
      series: analysisData.trends.series.map(s => ({
        name: s.name,
        type: chartType,
        data: s.data,
        smooth: true,
        markPoint: {
          data: [
            { type: 'max', name: '最高价' },
            { type: 'min', name: '最低价' }
          ]
        }
      }))
    };
  };

  // 生成价格分布图表选项
  const getPriceDistributionChartOption = () => {
    if (!analysisData || !analysisData.distribution || !analysisData.distribution.ranges || analysisData.distribution.ranges.length === 0) {
      return {};
    }

    return {
      title: {
        text: '价格分布',
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
        data: analysisData.distribution.ranges,
        axisLabel: {
          rotate: 45
        }
      },
      yAxis: {
        type: 'value',
        name: '数量'
      },
      series: [
        {
          name: '价格分布',
          type: 'bar',
          data: analysisData.distribution.counts,
          itemStyle: {
            color: '#1890ff'
          }
        }
      ]
    };
  };

  // 生成区域价格对比图表选项
  const getRegionComparisonChartOption = () => {
    if (!analysisData || !analysisData.regionComparison || !analysisData.regionComparison.regions || analysisData.regionComparison.regions.length === 0) {
      return {};
    }

    return {
      title: {
        text: '区域价格对比',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: ['最低价', '平均价', '最高价'],
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: analysisData.regionComparison.regions,
        axisLabel: {
          rotate: 45
        }
      },
      yAxis: {
        type: 'value',
        name: '价格'
      },
      series: [
        {
          name: '最低价',
          type: 'bar',
          data: analysisData.regionComparison.minPrices,
          itemStyle: {
            color: '#52c41a'
          }
        },
        {
          name: '平均价',
          type: 'bar',
          data: analysisData.regionComparison.avgPrices,
          itemStyle: {
            color: '#1890ff'
          }
        },
        {
          name: '最高价',
          type: 'bar',
          data: analysisData.regionComparison.maxPrices,
          itemStyle: {
            color: '#f5222d'
          }
        }
      ]
    };
  };

  // 价格变动表格列
  const priceChangeColumns = [
    {
      title: "服务",
      dataIndex: "serviceName",
      key: "serviceName",
    },
    {
      title: "路线",
      dataIndex: "route",
      key: "route",
    },
    {
      title: "初始价格",
      dataIndex: "initialPrice",
      key: "initialPrice",
      render: (price, record) => `${price} ${record.currency}/${record.unit}`
    },
    {
      title: "当前价格",
      dataIndex: "currentPrice",
      key: "currentPrice",
      render: (price, record) => `${price} ${record.currency}/${record.unit}`
    },
    {
      title: "变动幅度",
      dataIndex: "changeRate",
      key: "changeRate",
      render: (rate) => (
        <span style={{ color: rate > 0 ? '#f5222d' : rate < 0 ? '#52c41a' : 'inherit' }}>
          {rate > 0 ? <RiseOutlined /> : rate < 0 ? <FallOutlined /> : null}
          {rate > 0 ? '+' : ''}{rate}%
        </span>
      ),
      sorter: (a, b) => a.changeRate - b.changeRate,
      defaultSortOrder: 'descend'
    },
    {
      title: "变动次数",
      dataIndex: "changeCount",
      key: "changeCount",
      sorter: (a, b) => a.changeCount - b.changeCount
    },
    {
      title: "最后变动时间",
      dataIndex: "lastChangeTime",
      key: "lastChangeTime",
      render: (time) => new Date(time).toLocaleString()
    }
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Title level={2}>价格分析</Title>
        <Button 
          icon={<DownloadOutlined />}
          onClick={handleExport}
        >
          导出报表
        </Button>
      </div>

      <Card className="mb-6">
        <Form
          form={form}
          layout="horizontal"
          onFinish={handleSearch}
        >
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="dateRange"
                label="日期范围"
                rules={[{ required: true, message: "请选择日期范围" }]}
              >
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="serviceType"
                label="服务类型"
              >
                <Select placeholder="选择服务类型" allowClear>
                  <Option value={1}>物流服务</Option>
                  <Option value={2}>增值服务</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="serviceId"
                label="服务"
              >
                <Select placeholder="选择服务" allowClear>
                  {serviceTypes.map(type => (
                    <Option key={type.id} value={type.id}>{type.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="originRegionId"
                label="始发地"
              >
                <Select placeholder="选择始发地" allowClear>
                  {regions.map(region => (
                    <Option key={region.id} value={region.id}>{region.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="destinationRegionId"
                label="目的地"
              >
                <Select placeholder="选择目的地" allowClear>
                  {regions.map(region => (
                    <Option key={region.id} value={region.id}>{region.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item>
                <div className="flex items-center h-full">
                  <Radio.Group value={chartType} onChange={handleChartTypeChange} className="mr-4">
                    <Radio.Button value="line">折线图</Radio.Button>
                    <Radio.Button value="bar">柱状图</Radio.Button>
                  </Radio.Group>
                  <Space>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      icon={<SearchOutlined />}
                    >
                      分析
                    </Button>
                    <Button 
                      onClick={handleReset} 
                      icon={<ReloadOutlined />}
                    >
                      重置
                    </Button>
                  </Space>
                </div>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spin size="large" tip="分析中..." />
        </div>
      ) : analysisData ? (
        <>
          <Tabs defaultActiveKey="trend" className="mb-6">
            <TabPane tab="价格趋势" key="trend">
              <Card>
                <ReactECharts 
                  option={getPriceTrendChartOption()} 
                  style={{ height: 400 }}
                  notMerge={true}
                />
              </Card>
            </TabPane>
            <TabPane tab="价格分布" key="distribution">
              <Card>
                <ReactECharts 
                  option={getPriceDistributionChartOption()} 
                  style={{ height: 400 }}
                  notMerge={true}
                />
              </Card>
            </TabPane>
            <TabPane tab="区域对比" key="regionComparison">
              <Card>
                <ReactECharts 
                  option={getRegionComparisonChartOption()} 
                  style={{ height: 400 }}
                  notMerge={true}
                />
              </Card>
            </TabPane>
          </Tabs>

          <Card title="价格变动明细">
            <Table
              columns={priceChangeColumns}
              dataSource={analysisData.priceChanges || []}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </>
      ) : (
        <Card>
          <div className="flex justify-center items-center h-64">
            <Alert
              message="请选择分析条件"
              description="选择日期范围和其他条件并点击分析按钮获取价格分析数据"
              type="info"
              showIcon
            />
          </div>
        </Card>
      )}
    </div>
  );
}
