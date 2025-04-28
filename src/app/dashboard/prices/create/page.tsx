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
  Alert
} from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import OrganizationTreeSelect from "@/components/OrganizationTreeSelect";
import ApiClient from "@/lib/api-client";
import { ApiErrorHandler } from "@/lib/api-error-handler";
import { useNotification } from "@/components/GlobalNotification";

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function CreatePricePage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [services, setServices] = useState([]);
  const [regions, setRegions] = useState([]);
  const router = useRouter();
  const notification = useNotification();

  const [organizations, setOrganizations] = useState([]);
  const [priceType, setPriceType] = useState(1); // 默认为对外价格
  const [visibilityType, setVisibilityType] = useState(1); // 默认为所有组织可见
  const [selectedServiceType, setSelectedServiceType] = useState(1); // 默认选择物流服务
  const [apiError, setApiError] = useState(null);

  // 获取服务类型、区域数据和组织机构数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取服务类型
        const serviceTypesResponse = await ApiClient.get('/data/service-types');
        if (serviceTypesResponse.success) {
          setServiceTypes(serviceTypesResponse.data);
        }

        // 获取区域数据
        const regionsResponse = await ApiClient.get('/data/regions');
        if (regionsResponse.success) {
          setRegions(regionsResponse.data);
        }

        // 获取组织机构数据
        const organizationsResponse = await ApiClient.get('/organizations');
        if (organizationsResponse.success) {
          setOrganizations(organizationsResponse.data);
        }

        // 获取默认服务类型的服务列表
        const servicesResponse = await ApiClient.get(`/data/services?serviceTypeId=${selectedServiceType}`);
        if (servicesResponse.success) {
          setServices(servicesResponse.data);
        }
      } catch (error) {
        console.error("获取数据错误:", error);
        notification.error("获取初始数据失败", error.message);
      }
    };

    fetchData();
  }, [notification, selectedServiceType]);

  // 当服务类型变化时，获取对应的服务列表
  const handleServiceTypeChange = async (value) => {
    setSelectedServiceType(value);
    form.setFieldValue('serviceId', undefined); // 清空服务ID选择
  };

  // 提交表单
  const onFinish = async (values) => {
    setLoading(true);
    setApiError(null);

    try {
      // 处理可见组织数据
      let visibleOrgsString = null;
      if (values.visibilityType === 2 && values.visibleOrgs && values.visibleOrgs.length > 0) {
        // 格式化为 ,1,2,3, 的形式，方便数据库中使用 LIKE 查询
        visibleOrgsString = `,${values.visibleOrgs.join(',')},`;
      }

      const response = await ApiClient.post('/prices', {
        ...values,
        effectiveDate: values.effectiveDate.format('YYYY-MM-DD'),
        expiryDate: values.expiryDate ? values.expiryDate.format('YYYY-MM-DD') : null,
        visibleOrgs: visibleOrgsString
      });

      if (response.success) {
        notification.success("价格创建成功");
        router.push("/dashboard/prices");
      } else {
        notification.error("价格创建失败", response.message);
      }
    } catch (error) {
      console.error("创建价格错误:", error);
      setApiError(error);

      // 如果是验证错误或冲突错误，显示详细信息
      if (error.status === 400 || error.status === 409) {
        notification.error(
          error.message,
          ApiErrorHandler.getErrorDetailsText(error) || "请检查输入数据"
        );
      } else {
        notification.error("价格创建失败", error.message);
      }
    } finally {
      setLoading(false);
    }
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
        <Title level={2} className="m-0">创建价格</Title>
      </div>

      {apiError && apiError.status === 409 && (
        <Alert
          message="价格冲突"
          description="存在重叠的价格区间，请修改价格范围或日期范围"
          type="error"
          showIcon
          className="mb-4"
        />
      )}

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            serviceType: 1,
            priceType: 1,
            visibilityType: 1,
            currency: "CNY",
            priceUnit: "kg",
            isCurrent: true
          }}
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
              <OrganizationTreeSelect
                placeholder="选择所属组织机构"
                treeDefaultExpandAll
                showSearch
              />
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
              <OrganizationTreeSelect
                multiple
                treeCheckable
                placeholder="选择可见组织"
                showSearch
                style={{ width: '100%' }}
              />
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
                loading={loading}
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
      </Card>
    </div>
  );
}
