"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Form,
  Select,
  Input,
  Button,
  Table,
  Typography,
  Row,
  Col,
  Tag,
  Divider,
  message,
  Radio,
  Tooltip,
  Space,
  DatePicker,
  Slider,
  Checkbox,
  Collapse,
  InputNumber,
  Popover,
  Switch
} from "antd";
import {
  SearchOutlined,
  DownloadOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  InfoCircleOutlined,
  FilterOutlined,
  ReloadOutlined,
  SaveOutlined,
  SettingOutlined,
  UpOutlined,
  DownOutlined,
  ExportOutlined
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useSession } from "next-auth/react";
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { Panel } = Collapse;
const { RangePicker } = DatePicker;

interface PriceData {
  id: number;
  serviceType: number;
  serviceId: number;
  originRegionId: number | null;
  destinationRegionId: number | null;
  weightStart: number | null;
  weightEnd: number | null;
  volumeStart: number | null;
  volumeEnd: number | null;
  price: number;
  currency: string;
  priceUnit: string;
  effectiveDate: string;
  expiryDate: string | null;
  isCurrent: boolean;
  remark: string | null;
  organizationId: number | null;
  priceType: number;
  visibilityType: number;
  visibleOrgs: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;

  // 关联数据
  originRegion?: { id: number; name: string; code: string; } | null;
  destinationRegion?: { id: number; name: string; code: string; } | null;
  organization?: { id: number; name: string; } | null;
  creator?: { id: number; username: string; realName: string | null; } | null;

  // 增强数据
  weightRange?: string;
  volumeRange?: string;
  priceDisplay?: string;
  priceTypeDisplay?: string;
  visibilityDisplay?: string;
  validDays?: number | null;
  isExpiringSoon?: boolean;
}

export default function PriceQueryPage() {
  const { data: session } = useSession();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PriceData[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [sortField, setSortField] = useState<string>("price");
  const [sortOrder, setSortOrder] = useState<string>("asc");
  const [serviceTypes, setServiceTypes] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [priceTypes, setPriceTypes] = useState<any[]>([
    { value: 1, label: "对外价格" },
    { value: 2, label: "内部价格" }
  ]);

  // 新增状态
  const [advancedVisible, setAdvancedVisible] = useState(false);
  const [customColumns, setCustomColumns] = useState<string[]>([
    'serviceType', 'originRegion', 'destinationRegion', 'weightRange',
    'priceDisplay', 'priceTypeDisplay', 'effectiveDate', 'visibilityDisplay'
  ]);
  const [savedQueries, setSavedQueries] = useState<any[]>([]);
  const [columnsSettingVisible, setColumnsSettingVisible] = useState(false);



  // 加载服务类型和区域数据
  useEffect(() => {
    const fetchServiceTypes = async () => {
      try {
        const response = await fetch('/api/service-types');
        const result = await response.json();

        if (result.success) {
          setServiceTypes(result.data);
        }
      } catch (error) {
        console.error('获取服务类型错误:', error);
      }
    };

    const fetchRegions = async () => {
      try {
        const response = await fetch('/api/regions?level=2'); // 获取国家级区域
        const result = await response.json();

        if (result.success) {
          setRegions(result.data);
        }
      } catch (error) {
        console.error('获取区域数据错误:', error);
      }
    };

    // 从本地存储加载保存的查询条件
    const loadSavedQueries = () => {
      if (typeof window !== 'undefined') {
        try {
          const savedData = localStorage.getItem('savedPriceQueries');
          if (savedData) {
            setSavedQueries(JSON.parse(savedData));
          }
        } catch (error) {
          console.error('加载保存的查询条件错误:', error);
        }
      }
    };

    // 从本地存储加载自定义列设置
    const loadCustomColumns = () => {
      if (typeof window !== 'undefined') {
        try {
          const savedColumns = localStorage.getItem('priceQueryColumns');
          if (savedColumns) {
            setCustomColumns(JSON.parse(savedColumns));
          }
        } catch (error) {
          console.error('加载自定义列设置错误:', error);
        }
      }
    };

    fetchServiceTypes();
    fetchRegions();
    loadSavedQueries();
    loadCustomColumns();
  }, []);

  // 获取服务类型名称
  const getServiceTypeName = (type: number) => {
    switch (type) {
      case 1: return "传统物流";
      case 2: return "FBA头程物流";
      case 3: return "增值服务";
      default: return "未知";
    }
  };

  // 所有可用的表格列定义
  const allColumns: { [key: string]: any } = {
    serviceType: {
      title: "服务类型",
      dataIndex: "serviceType",
      key: "serviceType",
      render: (text: number) => {
        let color = "blue";
        if (text === 2) color = "green";
        if (text === 3) color = "purple";
        return <Tag color={color}>{getServiceTypeName(text)}</Tag>;
      },
    },
    serviceId: {
      title: "服务ID",
      dataIndex: "serviceId",
      key: "serviceId",
      width: 80,
    },
    originRegion: {
      title: "始发地",
      key: "originRegion",
      render: (_, record) => record.originRegion?.name || "全部",
    },
    destinationRegion: {
      title: "目的地",
      key: "destinationRegion",
      render: (_, record) => record.destinationRegion?.name || "全部",
    },
    weightRange: {
      title: "重量范围",
      dataIndex: "weightRange",
      key: "weightRange",
    },
    volumeRange: {
      title: "体积范围",
      dataIndex: "volumeRange",
      key: "volumeRange",
    },
    priceDisplay: {
      title: "价格",
      dataIndex: "priceDisplay",
      key: "price",
      sorter: true,
      sortOrder: sortField === "price" ? (sortOrder === "asc" ? "ascend" : "descend") : undefined,
    },
    priceTypeDisplay: {
      title: "价格类型",
      dataIndex: "priceTypeDisplay",
      key: "priceType",
      render: (text: string) => {
        const color = text === "内部价格" ? "orange" : "green";
        return <Tag color={color}>{text}</Tag>;
      },
    },
    effectiveDate: {
      title: "有效期",
      key: "effectiveDate",
      render: (_, record) => {
        const validityText = `${record.effectiveDate} 至 ${record.expiryDate || "长期"}`;

        if (record.isExpiringSoon) {
          return (
            <Tooltip title="即将到期">
              <Tag color="warning">{validityText}</Tag>
            </Tooltip>
          );
        }

        return validityText;
      },
      sorter: true,
      sortOrder: sortField === "effectiveDate" ? (sortOrder === "asc" ? "ascend" : "descend") : undefined,
    },
    visibilityDisplay: {
      title: "可见性",
      dataIndex: "visibilityDisplay",
      key: "visibility",
      render: (text: string) => {
        let color = "default";
        if (text === "所有组织可见") color = "green";
        if (text === "指定组织可见") color = "blue";
        if (text === "仅创建组织可见") color = "orange";
        return <Tag color={color}>{text}</Tag>;
      },
    },
    organization: {
      title: "所属组织",
      key: "organization",
      render: (_, record) => record.organization?.name || "-"
    },
    creator: {
      title: "创建人",
      key: "creator",
      render: (_, record) => record.creator?.realName || record.creator?.username || "-"
    },
    createdAt: {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (text: string) => new Date(text).toLocaleString()
    },
    updatedAt: {
      title: "更新时间",
      dataIndex: "updatedAt",
      key: "updatedAt",
      render: (text: string) => new Date(text).toLocaleString()
    },
    remark: {
      title: "备注",
      dataIndex: "remark",
      key: "remark",
      render: (text: string) => text || "-"
    }
  };

  // 根据自定义列设置生成当前表格列
  const columns: ColumnsType<PriceData> = customColumns.map(key => allColumns[key]);

  // 处理表格排序变化
  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    const { current, pageSize } = pagination;
    setPagination({ ...pagination, current, pageSize });

    if (sorter.field) {
      setSortField(sorter.field);
      setSortOrder(sorter.order === "ascend" ? "asc" : "desc");
    }

    // 使用当前表单值和排序条件重新查询
    const values = form.getFieldsValue();
    fetchPrices(values, current, pageSize, sorter.field, sorter.order === "ascend" ? "asc" : "desc");
  };

  // 查询价格数据
  const fetchPrices = async (values: any, page = 1, pageSize = 10, field = sortField, order = sortOrder) => {
    setLoading(true);

    try {
      // 记录查询开始时间
      const startTime = Date.now();

      // 处理日期
      let queryDate = new Date().toISOString().split('T')[0];
      if (values.date) {
        queryDate = values.date.format ? values.date.format('YYYY-MM-DD') : values.date;
      }

      // 构建查询参数
      const queryParams = {
        serviceType: values.serviceType,
        serviceId: values.serviceId,
        originRegionId: values.originRegionId,
        destinationRegionId: values.destinationRegionId,
        weight: values.weight,
        volume: values.volume,
        priceType: values.priceType,
        queryDate,
        page,
        pageSize,
        sortField: field,
        sortOrder: order,
        // 高级筛选参数
        priceMin: values.priceRange?.min,
        priceMax: values.priceRange?.max,
        validityStart: values.validityRange?.[0]?.format('YYYY-MM-DD'),
        validityEnd: values.validityRange?.[1]?.format('YYYY-MM-DD'),
        visibilityType: values.visibilityType,
        isExpiringSoon: values.isExpiringSoon,
        organizationId: values.organizationId,
        createdBy: values.createdBy
      };

      // 发送API请求
      const response = await fetch('/api/prices/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(queryParams),
      });

      const result = await response.json();

      // 计算查询耗时
      const executionTime = Date.now() - startTime;

      if (result.success) {
        setData(result.data.prices);
        setPagination({
          current: result.data.pagination.current,
          pageSize: result.data.pagination.pageSize,
          total: result.data.pagination.total
        });

        // 记录查询日志
        await fetch('/api/logs/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            queryType: 'PRICE_QUERY',
            queryParams: JSON.stringify(queryParams),
            resultCount: result.data.prices.length,
            executionTime
          }),
        });
      } else {
        message.error(result.message || "查询失败");
        setData([]);
        setPagination({ ...pagination, total: 0 });
      }
    } catch (error) {
      console.error('价格查询错误:', error);
      message.error('查询失败，请稍后重试');
      setData([]);
      setPagination({ ...pagination, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  // 表单提交
  const onFinish = (values: any) => {
    console.log("查询参数:", values);
    // 重置分页到第一页
    setPagination({ ...pagination, current: 1 });
    fetchPrices(values, 1, pagination.pageSize);
  };

  // 重置表单
  const handleReset = () => {
    form.resetFields();
    setData([]);
    setPagination({ ...pagination, current: 1, total: 0 });
  };

  // 切换高级筛选
  const toggleAdvanced = () => {
    setAdvancedVisible(!advancedVisible);
  };

  // 处理列设置变更
  const handleColumnsChange = (checkedValues: string[]) => {
    setCustomColumns(checkedValues);
  };

  // 保存当前查询条件
  const saveCurrentQuery = () => {
    const values = form.getFieldsValue();
    const queryName = prompt('请输入查询条件名称');

    if (queryName) {
      const newQuery = {
        id: Date.now(),
        name: queryName,
        values
      };

      const updatedQueries = [...savedQueries, newQuery];
      setSavedQueries(updatedQueries);

      // 保存到本地存储
      if (typeof window !== 'undefined') {
        localStorage.setItem('savedPriceQueries', JSON.stringify(updatedQueries));
      }

      message.success(`查询条件 "${queryName}" 已保存`);
    }
  };

  // 加载保存的查询条件
  const loadSavedQuery = (query: any) => {
    form.setFieldsValue(query.values);
    message.info(`已加载查询条件 "${query.name}"`);
  };

  // 删除保存的查询条件
  const deleteSavedQuery = (id: number) => {
    const updatedQueries = savedQueries.filter(q => q.id !== id);
    setSavedQueries(updatedQueries);

    // 更新本地存储
    if (typeof window !== 'undefined') {
      localStorage.setItem('savedPriceQueries', JSON.stringify(updatedQueries));
    }

    message.success('查询条件已删除');
  };

  // 导出价格数据
  const handleExport = async () => {
    if (data.length === 0) {
      message.warning('没有数据可导出');
      return;
    }

    setLoading(true);
    try {
      // 获取当前查询条件
      const values = form.getFieldsValue();

      const response = await fetch('/api/prices/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters: {
            serviceType: values.serviceType,
            serviceId: values.serviceId,
            originRegionId: values.originRegionId,
            destinationRegionId: values.destinationRegionId,
            priceType: values.priceType
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        message.success(`导出成功，共${result.data.recordCount}条数据`);

        // 创建下载链接
        if (result.data && result.data.downloadUrl) {
          const link = document.createElement('a');
          link.href = result.data.downloadUrl;
          link.download = result.data.fileName || '价格数据.xlsx';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        message.error(result.message || '导出失败');
      }
    } catch (error) {
      console.error('导出数据错误:', error);
      message.error('导出失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={2}>价格查询</Title>

      <Card className="mb-6">
        <Form
          form={form}
          name="price_query"
          onFinish={onFinish}
          layout="vertical"
          initialValues={{ date: dayjs() }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item
                name="serviceType"
                label="服务类型"
              >
                <Select placeholder="选择服务类型" allowClear>
                  <Option value={1}>传统物流</Option>
                  <Option value={2}>FBA头程物流</Option>
                  <Option value={3}>增值服务</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item
                name="serviceId"
                label="服务ID"
              >
                <Input type="number" min={1} placeholder="输入服务ID" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item
                name="originRegionId"
                label="始发地"
              >
                <Select placeholder="选择始发地" allowClear showSearch optionFilterProp="children">
                  {regions.map(region => (
                    <Option key={region.id} value={region.id}>{region.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item
                name="destinationRegionId"
                label="目的地"
              >
                <Select placeholder="选择目的地" allowClear showSearch optionFilterProp="children">
                  {regions.map(region => (
                    <Option key={region.id} value={region.id}>{region.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item
                name="weight"
                label="重量(kg)"
              >
                <Input type="number" min={0} step="0.01" placeholder="输入重量" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item
                name="volume"
                label="体积(m³)"
              >
                <Input type="number" min={0} step="0.01" placeholder="输入体积" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item
                name="date"
                label="查询日期"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item
                name="priceType"
                label="价格类型"
              >
                <Select placeholder="选择价格类型" allowClear>
                  {priceTypes.map(type => (
                    <Option key={type.value} value={type.value}>{type.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            {/* 高级筛选区域 */}
            {advancedVisible && (
              <>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item
                    name="priceRange"
                    label="价格范围"
                  >
                    <Input.Group compact>
                      <Form.Item
                        name={['priceRange', 'min']}
                        noStyle
                      >
                        <InputNumber
                          style={{ width: '45%' }}
                          placeholder="最小值"
                          min={0}
                        />
                      </Form.Item>
                      <Input
                        style={{ width: '10%', textAlign: 'center', pointerEvents: 'none' }}
                        placeholder="~"
                        disabled
                      />
                      <Form.Item
                        name={['priceRange', 'max']}
                        noStyle
                      >
                        <InputNumber
                          style={{ width: '45%' }}
                          placeholder="最大值"
                          min={0}
                        />
                      </Form.Item>
                    </Input.Group>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item
                    name="validityRange"
                    label="有效期范围"
                  >
                    <RangePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item
                    name="visibilityType"
                    label="可见性"
                  >
                    <Select placeholder="选择可见性" allowClear>
                      <Option value={1}>所有组织可见</Option>
                      <Option value={2}>指定组织可见</Option>
                      <Option value={3}>仅创建组织可见</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item
                    name="isExpiringSoon"
                    label="即将到期"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item
                    name="organizationId"
                    label="所属组织"
                  >
                    <Select placeholder="选择组织" allowClear>
                      <Option value={1}>总公司</Option>
                      <Option value={2}>北京分公司</Option>
                      <Option value={3}>上海分公司</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Form.Item
                    name="createdBy"
                    label="创建人"
                  >
                    <Select placeholder="选择创建人" allowClear>
                      <Option value={1}>管理员</Option>
                      <Option value={2}>价格管理员</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </>
            )}

            {/* 操作按钮区域 */}
            <Col xs={24} sm={24} md={24} lg={24}>
              <Form.Item>
                <div className="flex justify-between">
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
                      icon={<ReloadOutlined />}
                      onClick={handleReset}
                    >
                      重置
                    </Button>
                    <Button
                      type="link"
                      onClick={toggleAdvanced}
                      icon={advancedVisible ? <UpOutlined /> : <DownOutlined />}
                    >
                      {advancedVisible ? '收起' : '高级筛选'}
                    </Button>
                  </Space>

                  <Space>
                    <Popover
                      title="保存的查询条件"
                      trigger="click"
                      content={
                        <div style={{ maxWidth: 300 }}>
                          {savedQueries.length > 0 ? (
                            <List
                              size="small"
                              dataSource={savedQueries}
                              renderItem={(item) => (
                                <List.Item
                                  actions={[
                                    <Button
                                      key="load"
                                      type="link"
                                      size="small"
                                      onClick={() => loadSavedQuery(item)}
                                    >
                                      加载
                                    </Button>,
                                    <Button
                                      key="delete"
                                      type="link"
                                      danger
                                      size="small"
                                      onClick={() => deleteSavedQuery(item.id)}
                                    >
                                      删除
                                    </Button>
                                  ]}
                                >
                                  {item.name}
                                </List.Item>
                              )}
                            />
                          ) : (
                            <div>暂无保存的查询条件</div>
                          )}
                        </div>
                      }
                    >
                      <Button icon={<SaveOutlined />}>
                        查询条件
                      </Button>
                    </Popover>

                    <Button
                      icon={<SaveOutlined />}
                      onClick={saveCurrentQuery}
                    >
                      保存当前查询
                    </Button>

                    {data.length > 0 && (
                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={handleExport}
                        disabled={!session?.user.permissions.includes("price:export") &&
                                 !session?.user.permissions.includes("price:export:batch")}
                      >
                        导出
                      </Button>
                    )}
                  </Space>
                </div>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card
        title={
          <Space>
            <span>查询结果</span>
            {data.length > 0 && <Tag color="blue">{pagination.total} 条记录</Tag>}
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="按价格排序">
              <Radio.Group
                value={sortField === "price" ? sortOrder : ""}
                onChange={(e) => {
                  setSortField("price");
                  setSortOrder(e.target.value);
                  const values = form.getFieldsValue();
                  fetchPrices(values, pagination.current, pagination.pageSize, "price", e.target.value);
                }}
                optionType="button"
                buttonStyle="solid"
                size="small"
              >
                <Radio.Button value="asc"><SortAscendingOutlined /> 价格</Radio.Button>
                <Radio.Button value="desc"><SortDescendingOutlined /> 价格</Radio.Button>
              </Radio.Group>
            </Tooltip>

            <Tooltip title="按有效期排序">
              <Radio.Group
                value={sortField === "effectiveDate" ? sortOrder : ""}
                onChange={(e) => {
                  setSortField("effectiveDate");
                  setSortOrder(e.target.value);
                  const values = form.getFieldsValue();
                  fetchPrices(values, pagination.current, pagination.pageSize, "effectiveDate", e.target.value);
                }}
                optionType="button"
                buttonStyle="solid"
                size="small"
              >
                <Radio.Button value="asc"><SortAscendingOutlined /> 日期</Radio.Button>
                <Radio.Button value="desc"><SortDescendingOutlined /> 日期</Radio.Button>
              </Radio.Group>
            </Tooltip>

            <Popover
              title="自定义列显示"
              trigger="click"
              open={columnsSettingVisible}
              onOpenChange={setColumnsSettingVisible}
              content={
                <div style={{ width: 300 }}>
                  <Checkbox.Group
                    value={customColumns}
                    onChange={(checkedValues) => {
                      const newColumns = checkedValues as string[];
                      setCustomColumns(newColumns);

                      // 保存到本地存储
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('priceQueryColumns', JSON.stringify(newColumns));
                      }
                    }}
                    style={{ display: 'flex', flexDirection: 'column' }}
                  >
                    {Object.keys(allColumns).map(key => (
                      <Checkbox key={key} value={key} style={{ marginLeft: 0, marginBottom: 8 }}>
                        {allColumns[key].title}
                      </Checkbox>
                    ))}
                  </Checkbox.Group>
                  <div className="mt-4 flex justify-end">
                    <Button
                      size="small"
                      onClick={() => {
                        const defaultColumns = [
                          'serviceType', 'originRegion', 'destinationRegion', 'weightRange',
                          'priceDisplay', 'priceTypeDisplay', 'effectiveDate', 'visibilityDisplay'
                        ];
                        setCustomColumns(defaultColumns);

                        // 保存到本地存储
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('priceQueryColumns', JSON.stringify(defaultColumns));
                        }
                      }}
                    >
                      恢复默认
                    </Button>
                  </div>
                </div>
              }
            >
              <Button icon={<SettingOutlined />}>列设置</Button>
            </Popover>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
        {data.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            请输入查询条件并点击查询按钮
          </div>
        )}
      </Card>
    </div>
  );
}
