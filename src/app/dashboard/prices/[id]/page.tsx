"use client";

import { useState, useEffect } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  Select,
  DatePicker,
  InputNumber,
  Switch,
  message,
  Typography,
  Divider,
  Space,
  Skeleton,
  Tabs,
  Alert,
  Table
} from "antd";
import { ArrowLeftOutlined, SaveOutlined, HistoryOutlined } from "@ant-design/icons";
import axios from "axios";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function EditPricePage({ params }) {
  const { id } = params;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [services, setServices] = useState([]);
  const [regions, setRegions] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [priceType, setPriceType] = useState(1); // 默认为对外价格
  const [visibilityType, setVisibilityType] = useState(1); // 默认为所有组织可见
  const [selectedServiceType, setSelectedServiceType] = useState(1); // 默认选择物流服务
  const router = useRouter();

  // 获取价格详情和相关数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取价格详情
        const priceResponse = await axios.get(`/api/prices/${id}`);
        if (priceResponse.data.success) {
          const priceData = priceResponse.data.data;

          // 格式化日期
          form.setFieldsValue({
            ...priceData,
            effectiveDate: priceData.effectiveDate ? dayjs(priceData.effectiveDate) : null,
            expiryDate: priceData.expiryDate ? dayjs(priceData.expiryDate) : null,
          });

          // 设置状态变量
          setPriceType(priceData.priceType || 1);
          setVisibilityType(priceData.visibilityType || 1);
          setSelectedServiceType(priceData.serviceType || 1);

          // 获取价格历史记录
          const historyResponse = await axios.get(`/api/prices/${id}/history`);
          if (historyResponse.data.success) {
            setPriceHistory(historyResponse.data.data);
          }
        } else {
          message.error("获取价格详情失败");
          router.push("/dashboard/prices");
        }

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

        // 获取组织机构数据
        const organizationsResponse = await axios.get('/api/organizations');
        if (organizationsResponse.data.success) {
          setOrganizations(organizationsResponse.data.data);
        }
      } catch (error) {
        console.error("获取数据错误:", error);
        message.error("获取数据失败");
        router.push("/dashboard/prices");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, form, router]);

  // 获取服务列表
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const servicesResponse = await axios.get(`/api/data/services?serviceTypeId=${selectedServiceType}`);
        if (servicesResponse.data.success) {
          setServices(servicesResponse.data.data);
        }
      } catch (error) {
        console.error("获取服务数据错误:", error);
        message.error("获取服务数据失败");
      }
    };

    if (selectedServiceType) {
      fetchServices();
    }
  }, [selectedServiceType]);

  // 当服务类型变化时，获取对应的服务列表
  const handleServiceTypeChange = (value) => {
    setSelectedServiceType(value);
    form.setFieldValue('serviceId', undefined); // 清空服务ID选择
  };

  // 提交表单
  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      // 处理可见组织数据
      let visibleOrgsString = null;
      if (values.visibilityType === 2 && values.visibleOrgs && values.visibleOrgs.length > 0) {
        // 格式化为 ,1,2,3, 的形式，方便数据库中使用 LIKE 查询
        visibleOrgsString = `,${values.visibleOrgs.join(',')},`;
      }

      const { data } = await axios.put(`/api/prices/${id}`, {
        ...values,
        effectiveDate: values.effectiveDate.format('YYYY-MM-DD'),
        expiryDate: values.expiryDate ? values.expiryDate.format('YYYY-MM-DD') : null,
        visibleOrgs: visibleOrgsString
      });

      if (data.success) {
        message.success("价格更新成功");
        router.push("/dashboard/prices");
      } else {
        message.error(data.message || "价格更新失败");
      }
    } catch (error) {
      console.error("更新价格错误:", error);
      message.error("价格更新失败");
    } finally {
      setSubmitting(false);
    }
  };

  // 历史记录列
  const historyColumns = [
    {
      title: "操作类型",
      dataIndex: "operationType",
      key: "operationType",
    },
    {
      title: "价格",
      key: "price",
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
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "失效日期",
      dataIndex: "expiryDate",
      key: "expiryDate",
      render: (date) => date ? new Date(date).toLocaleDateString() : "-",
    },
    {
      title: "操作人",
      dataIndex: "operator",
      key: "operator",
      render: (operator) => operator?.username || "-",
    },
    {
      title: "操作时间",
      dataIndex: "operatedAt",
      key: "operatedAt",
      render: (date) => new Date(date).toLocaleString(),
    },
  ];

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
        <Title level={2} className="m-0">编辑价格</Title>
      </div>

      <Card>
        {loading ? (
          <Skeleton active paragraph={{ rows: 10 }} />
        ) : (
          <Tabs
            defaultActiveKey="basic"
            items={[
              {
                key: 'basic',
                label: '基本信息',
                children: (
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                  >
                    <Divider orientation="left">基本信息</Divider>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Form.Item
                        name="serviceType"
                        label="服务类型"
                        rules={[{ required: true, message: "请选择服务类型" }]}
                      >
                        <Select
                          placeholder="选择服务类型"
                          onChange={handleServiceTypeChange}
                        >
                          <Option value={1}>物流服务</Option>
                          <Option value={2}>增值服务</Option>
                        </Select>
                      </Form.Item>

                      <Form.Item
                        name="serviceId"
                        label="服务ID"
                        rules={[{ required: true, message: "请选择服务" }]}
                      >
                        <Select placeholder="选择服务">
                          {services.map(service => (
                            <Option key={service.id} value={service.id}>{service.name}</Option>
                          ))}
                        </Select>
                      </Form.Item>

                      <Form.Item
                        name="isCurrent"
                        label="是否当前有效"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </div>

                    <Divider orientation="left">价格类型和可见性</Divider>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Form.Item
                        name="organizationId"
                        label="所属组织机构"
                        rules={[{ required: true, message: "请选择所属组织机构" }]}
                      >
                        <Select placeholder="选择所属组织机构">
                          {organizations.map(org => (
                            <Option key={org.id} value={org.id}>{org.name}</Option>
                          ))}
                        </Select>
                      </Form.Item>

                      <Form.Item
                        name="priceType"
                        label="价格类型"
                        rules={[{ required: true, message: "请选择价格类型" }]}
                      >
                        <Select
                          placeholder="选择价格类型"
                          onChange={(value) => setPriceType(value)}
                        >
                          <Option value={1}>对外价格</Option>
                          <Option value={2}>内部价格</Option>
                        </Select>
                      </Form.Item>

                      <Form.Item
                        name="visibilityType"
                        label="可见性设置"
                        rules={[{ required: true, message: "请选择可见性设置" }]}
                      >
                        <Select
                          placeholder="选择可见性设置"
                          onChange={(value) => setVisibilityType(value)}
                        >
                          <Option value={1}>所有组织可见</Option>
                          <Option value={2}>指定组织可见</Option>
                          <Option value={3}>仅创建组织可见</Option>
                        </Select>
                      </Form.Item>
                    </div>

                    {visibilityType === 2 && (
                      <Form.Item
                        name="visibleOrgs"
                        label="可见组织"
                        rules={[{ required: true, message: "请选择可见组织" }]}
                      >
                        <Select
                          mode="multiple"
                          placeholder="选择可见组织"
                          style={{ width: '100%' }}
                        >
                          {organizations.map(org => (
                            <Option key={org.id} value={org.id}>{org.name}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    )}

                    {visibilityType === 2 && (
                      <Alert
                        message="提示"
                        description="选择的组织及其下属组织都将可以查看此价格"
                        type="info"
                        showIcon
                        className="mb-4"
                      />
                    )}

                    <Divider orientation="left">区域信息</Divider>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>

                    <Divider orientation="left">重量和体积范围</Divider>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Form.Item
                        name="weightStart"
                        label="重量下限(kg)"
                      >
                        <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                      </Form.Item>

                      <Form.Item
                        name="weightEnd"
                        label="重量上限(kg)"
                      >
                        <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                      </Form.Item>

                      <Form.Item
                        name="volumeStart"
                        label="体积下限(m³)"
                      >
                        <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                      </Form.Item>

                      <Form.Item
                        name="volumeEnd"
                        label="体积上限(m³)"
                      >
                        <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                      </Form.Item>
                    </div>

                    <Divider orientation="left">价格信息</Divider>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Form.Item
                        name="price"
                        label="价格"
                        rules={[{ required: true, message: "请输入价格" }]}
                      >
                        <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                      </Form.Item>

                      <Form.Item
                        name="currency"
                        label="货币"
                        rules={[{ required: true, message: "请选择货币" }]}
                      >
                        <Select placeholder="选择货币">
                          <Option value="CNY">人民币(CNY)</Option>
                          <Option value="USD">美元(USD)</Option>
                          <Option value="EUR">欧元(EUR)</Option>
                          <Option value="GBP">英镑(GBP)</Option>
                        </Select>
                      </Form.Item>

                      <Form.Item
                        name="priceUnit"
                        label="计价单位"
                        rules={[{ required: true, message: "请选择计价单位" }]}
                      >
                        <Select placeholder="选择计价单位">
                          <Option value="kg">千克(kg)</Option>
                          <Option value="m3">立方米(m³)</Option>
                          <Option value="piece">件</Option>
                          <Option value="ticket">票</Option>
                        </Select>
                      </Form.Item>
                    </div>

                    <Divider orientation="left">有效期</Divider>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Form.Item
                        name="effectiveDate"
                        label="生效日期"
                        rules={[{ required: true, message: "请选择生效日期" }]}
                      >
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>

                      <Form.Item
                        name="expiryDate"
                        label="失效日期"
                      >
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                    </div>

                    <Form.Item
                      name="remark"
                      label="备注"
                    >
                      <TextArea rows={4} />
                    </Form.Item>

                    <Form.Item>
                      <Space>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={submitting}
                          icon={<SaveOutlined />}
                        >
                          保存
                        </Button>
                        <Button onClick={() => router.push("/dashboard/prices")}>
                          取消
                        </Button>
                      </Space>
                    </Form.Item>
                  </Form>
                )
              },
              {
                key: 'history',
                label: (
                  <span>
                    <HistoryOutlined />
                    价格历史
                  </span>
                ),
                children: (
                  priceHistory.length > 0 ? (
                    <Table
                      columns={historyColumns}
                      dataSource={priceHistory}
                      rowKey="id"
                      pagination={{ pageSize: 5 }}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <p>暂无历史记录</p>
                    </div>
                  )
                )
              }
            ]}
          />
        )}
      </Card>
    </div>
  );
}
