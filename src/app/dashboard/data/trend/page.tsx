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
  Space,
  Divider,
  message
} from "antd";
import { SearchOutlined } from "@ant-design/icons";
import dynamic from "next/dynamic";

// 动态导入ECharts组件，避免SSR问题
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function PriceTrendPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<any>(null);
  const [chartType, setChartType] = useState<string>("line");

  // 模拟数据
  const mockServiceTypes = [
    { id: 1, name: "传统物流" },
    { id: 2, name: "FBA头程物流" },
    { id: 3, name: "增值服务" }
  ];

  const mockServices = [
    { id: 1, name: "标准海运", serviceTypeId: 1 },
    { id: 2, name: "快速空运", serviceTypeId: 1 },
    { id: 3, name: "FBA海运头程", serviceTypeId: 2 },
    { id: 4, name: "FBA空运头程", serviceTypeId: 2 },
    { id: 5, name: "贴标服务", serviceTypeId: 3 }
  ];

  const mockRegions = [
    { id: 7, name: "中国" },
    { id: 16, name: "美国" },
    { id: 14, name: "英国" },
    { id: 13, name: "德国" }
  ];

  // 模拟价格趋势数据
  const mockTrendData = {
    dates: [
      "2024-01", "2024-02", "2024-03", "2024-04", "2024-05", "2024-06",
      "2024-07", "2024-08", "2024-09", "2024-10", "2024-11", "2024-12"
    ],
    series: [
      {
        name: "标准海运 (中国-美国)",
        data: [75, 78, 80, 82, 85, 88, 90, 92, 90, 88, 85, 80]
      },
      {
        name: "快速空运 (中国-德国)",
        data: [110, 115, 120, 125, 130, 135, 140, 145, 150, 145, 140, 135]
      },
      {
        name: "FBA海运头程 (中国-美国)",
        data: [70, 72, 75, 78, 80, 82, 85, 88, 90, 85, 80, 75]
      }
    ]
  };

  // 处理服务类型变化
  const handleServiceTypeChange = (value: number) => {
    // 根据服务类型筛选服务
    form.setFieldsValue({ serviceId: undefined });
  };

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
        serviceTypeId: values.serviceTypeId,
        serviceId: values.serviceId,
        regionId: values.regionId,
        dateRange
      };

      // 发送API请求
      const response = await fetch('/api/data/price-trend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(queryParams),
      });

      const result = await response.json();

      if (result.success) {
        setChartData(result.data);
      } else {
        message.error(result.message || "获取价格趋势数据失败");
        // 使用模拟数据作为备选
        setChartData(mockTrendData);
      }
    } catch (error) {
      console.error('获取价格趋势数据错误:', error);
      message.error('获取价格趋势数据失败，请稍后重试');
      // 使用模拟数据作为备选
      setChartData(mockTrendData);
    } finally {
      setLoading(false);
    }
  };

  // 获取ECharts配置
  const getChartOption = () => {
    if (!chartData) return {};

    return {
      title: {
        text: "价格趋势分析",
        left: "center"
      },
      tooltip: {
        trigger: "axis",
        formatter: function(params: any) {
          let result = params[0].axisValue + "<br/>";
          params.forEach((param: any) => {
            result += param.marker + param.seriesName + ": " + param.value + " CNY<br/>";
          });
          return result;
        }
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
        boundaryGap: false,
        data: chartData.dates
      },
      yAxis: {
        type: "value",
        name: "价格 (CNY)",
        axisLabel: {
          formatter: "{value} CNY"
        }
      },
      series: chartData.series.map((item: any) => ({
        name: item.name,
        type: chartType,
        data: item.data,
        smooth: true,
        markPoint: chartType === "line" ? {
          data: [
            { type: "max", name: "最高价" },
            { type: "min", name: "最低价" }
          ]
        } : undefined
      }))
    };
  };

  return (
    <div>
      <Title level={2}>价格趋势分析</Title>

      <Card className="mb-6">
        <Form
          form={form}
          onFinish={handleSearch}
          layout="vertical"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Form.Item
              name="serviceTypeId"
              label="服务类型"
            >
              <Select
                placeholder="选择服务类型"
                allowClear
                onChange={handleServiceTypeChange}
              >
                {mockServiceTypes.map(type => (
                  <Option key={type.id} value={type.id}>{type.name}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="serviceId"
              label="服务名称"
            >
              <Select
                placeholder="选择服务名称"
                allowClear
              >
                {mockServices
                  .filter(service => !form.getFieldValue("serviceTypeId") || service.serviceTypeId === form.getFieldValue("serviceTypeId"))
                  .map(service => (
                    <Option key={service.id} value={service.id}>{service.name}</Option>
                  ))
                }
              </Select>
            </Form.Item>

            <Form.Item
              name="regionId"
              label="区域"
            >
              <Select
                placeholder="选择区域"
                allowClear
              >
                {mockRegions.map(region => (
                  <Option key={region.id} value={region.id}>{region.name}</Option>
                ))}
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
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Spin size="large" />
          </div>
        ) : chartData ? (
          <>
            <div className="mb-4 flex justify-end">
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

            <div style={{ height: "500px" }}>
              <ReactECharts
                option={getChartOption()}
                style={{ height: "100%" }}
              />
            </div>

            <Divider />

            <div className="text-sm text-gray-500">
              <p>* 价格趋势数据基于历史价格记录生成，仅供参考</p>
              <p>* 图表可通过右上角工具栏保存为图片</p>
            </div>
          </>
        ) : (
          <Empty
            description="暂无数据，请选择查询条件"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            className="py-20"
          />
        )}
      </Card>
    </div>
  );
}
