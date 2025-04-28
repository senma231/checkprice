"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  Button, 
  Typography, 
  Form, 
  Select, 
  DatePicker, 
  Space, 
  Radio, 
  Spin, 
  Empty,
  Alert
} from "antd";
import { ArrowLeftOutlined, SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import axios from "axios";
import ReactECharts from "echarts-for-react";

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function PriceTrendPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState("line");
  const [chartData, setChartData] = useState(null);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [regions, setRegions] = useState([]);
  const router = useRouter();

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

  // 查询价格趋势
  const handleSearch = async (values) => {
    setLoading(true);
    try {
      const { data } = await axios.post('/api/prices/trend', {
        ...values,
        dateRange: values.dateRange ? [
          values.dateRange[0].format('YYYY-MM-DD'),
          values.dateRange[1].format('YYYY-MM-DD')
        ] : undefined
      });

      if (data.success) {
        setChartData(data.data);
      } else {
        setChartData(null);
      }
    } catch (error) {
      console.error("获取价格趋势错误:", error);
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  // 重置表单
  const handleReset = () => {
    form.resetFields();
    setChartData(null);
  };

  // 生成图表选项
  const getChartOption = () => {
    if (!chartData || !chartData.dates || chartData.dates.length === 0) {
      return {};
    }

    return {
      title: {
        text: '价格趋势分析',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        formatter: function(params) {
          let result = params[0].axisValue + '<br/>';
          params.forEach(param => {
            result += param.marker + ' ' + param.seriesName + ': ' + param.value + '<br/>';
          });
          return result;
        }
      },
      legend: {
        data: chartData.series.map(s => s.name),
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true
      },
      toolbox: {
        feature: {
          saveAsImage: {}
        }
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: chartData.dates
      },
      yAxis: {
        type: 'value',
        name: '价格',
        axisLabel: {
          formatter: '{value}'
        }
      },
      series: chartData.series.map(s => ({
        name: s.name,
        type: chartType,
        data: s.data,
        smooth: true,
        markPoint: {
          data: [
            { type: 'max', name: '最大值' },
            { type: 'min', name: '最小值' }
          ]
        }
      }))
    };
  };

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => router.push("/dashboard/prices")}
          className="mr-4"
        >
          返回
        </Button>
        <Title level={2} className="m-0">价格趋势分析</Title>
      </div>

      <Card className="mb-6">
        <Form
          form={form}
          layout="horizontal"
          onFinish={handleSearch}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Form.Item
              name="serviceType"
              label="服务类型"
              rules={[{ required: true, message: "请选择服务类型" }]}
            >
              <Select placeholder="选择服务类型">
                <Option value={1}>物流服务</Option>
                <Option value={2}>增值服务</Option>
              </Select>
            </Form.Item>

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

            <Form.Item
              name="dateRange"
              label="日期范围"
              rules={[{ required: true, message: "请选择日期范围" }]}
            >
              <RangePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <Form.Item
              name="weight"
              label="重量(kg)"
            >
              <Select placeholder="选择重量范围" allowClear>
                <Option value="0-10">0-10 kg</Option>
                <Option value="10-50">10-50 kg</Option>
                <Option value="50-100">50-100 kg</Option>
                <Option value="100-500">100-500 kg</Option>
                <Option value="500+">500+ kg</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                icon={<SearchOutlined />}
              >
                查询
              </Button>
              <Button 
                onClick={handleReset}
                icon={<ReloadOutlined />}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card>
        <div className="mb-4">
          <Radio.Group 
            value={chartType} 
            onChange={e => setChartType(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="line">折线图</Radio.Button>
            <Radio.Button value="bar">柱状图</Radio.Button>
            <Radio.Button value="area">面积图</Radio.Button>
          </Radio.Group>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-80">
            <Spin size="large" tip="加载中..." />
          </div>
        ) : chartData ? (
          chartData.series.length > 0 ? (
            <ReactECharts 
              option={getChartOption()} 
              style={{ height: 500 }}
              notMerge={true}
            />
          ) : (
            <div className="flex justify-center items-center h-80">
              <Empty description="没有找到符合条件的价格数据" />
            </div>
          )
        ) : (
          <div className="flex justify-center items-center h-80">
            <Alert
              message="请选择查询条件"
              description="选择服务类型、日期范围等条件进行价格趋势查询"
              type="info"
              showIcon
            />
          </div>
        )}
      </Card>
    </div>
  );
}
