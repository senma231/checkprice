"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Typography,
  Upload,
  Button,
  message,
  Steps,
  Table,
  Tag,
  Tabs,
  Space,
  Divider,
  Alert
} from "antd";
import {
  InboxOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  DownloadOutlined,
  EyeOutlined
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { UploadFile, UploadProps } from "antd/es/upload/interface";

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { TabPane } = Tabs;

interface ImportRecord {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: string;
  importStatus: number; // 0:处理中,1:成功,2:失败
  totalRecords: number;
  successRecords: number;
  failedRecords: number;
  errorMessage: string | null;
  importedBy: string;
  importedAt: string;
}

interface ImportError {
  id: number;
  importId: number;
  rowNumber: number;
  errorMessage: string;
  rawData: string;
}

export default function PriceImportPage() {
  const [activeTab, setActiveTab] = useState("import");
  const [currentStep, setCurrentStep] = useState(0);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importRecords, setImportRecords] = useState<ImportRecord[]>([]);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [selectedImportId, setSelectedImportId] = useState<number | null>(null);

  // 模拟导入记录数据
  const mockImportRecords: ImportRecord[] = [
    {
      id: 1,
      fileName: "传统物流价格表.xlsx",
      fileType: "EXCEL",
      fileSize: "256KB",
      importStatus: 1,
      totalRecords: 120,
      successRecords: 120,
      failedRecords: 0,
      errorMessage: null,
      importedBy: "admin",
      importedAt: "2025-04-20 10:30:45",
    },
    {
      id: 2,
      fileName: "FBA头程价格表.xlsx",
      fileType: "EXCEL",
      fileSize: "312KB",
      importStatus: 1,
      totalRecords: 85,
      successRecords: 82,
      failedRecords: 3,
      errorMessage: null,
      importedBy: "admin",
      importedAt: "2025-04-21 14:22:10",
    },
    {
      id: 3,
      fileName: "增值服务价格表.pdf",
      fileType: "PDF",
      fileSize: "128KB",
      importStatus: 2,
      totalRecords: 0,
      successRecords: 0,
      failedRecords: 0,
      errorMessage: "PDF解析失败，格式不支持",
      importedBy: "admin",
      importedAt: "2025-04-22 09:15:33",
    },
    {
      id: 4,
      fileName: "空运价格更新.xlsx",
      fileType: "EXCEL",
      fileSize: "198KB",
      importStatus: 0,
      totalRecords: 45,
      successRecords: 0,
      failedRecords: 0,
      errorMessage: null,
      importedBy: "admin",
      importedAt: "2025-04-24 08:05:12",
    },
  ];

  // 模拟导入错误数据
  const mockImportErrors: ImportError[] = [
    {
      id: 1,
      importId: 2,
      rowNumber: 15,
      errorMessage: "目的地不存在",
      rawData: "FBA海运头程,中国,未知地区,0,100,0,1,85,CNY,kg,2025-01-01,2025-12-31",
    },
    {
      id: 2,
      importId: 2,
      rowNumber: 42,
      errorMessage: "价格格式错误",
      rawData: "FBA空运头程,中国,美国,0,50,0,0.5,价格待定,CNY,kg,2025-01-01,2025-12-31",
    },
    {
      id: 3,
      importId: 2,
      rowNumber: 67,
      errorMessage: "日期格式错误",
      rawData: "FBA快递头程,中国,德国,0,20,0,0.2,150,CNY,kg,2025/01/01,长期",
    },
  ];

  // 导入记录表格列
  const importRecordColumns: ColumnsType<ImportRecord> = [
    {
      title: "文件名",
      dataIndex: "fileName",
      key: "fileName",
    },
    {
      title: "文件类型",
      dataIndex: "fileType",
      key: "fileType",
      render: (text) => (
        <Tag icon={text === "EXCEL" ? <FileExcelOutlined /> : <FilePdfOutlined />} color={text === "EXCEL" ? "green" : "blue"}>
          {text}
        </Tag>
      ),
    },
    {
      title: "文件大小",
      dataIndex: "fileSize",
      key: "fileSize",
    },
    {
      title: "状态",
      key: "importStatus",
      render: (_, record) => {
        let color = "blue";
        let text = "处理中";

        if (record.importStatus === 1) {
          color = "green";
          text = "成功";
        } else if (record.importStatus === 2) {
          color = "red";
          text = "失败";
        }

        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: "总记录数",
      dataIndex: "totalRecords",
      key: "totalRecords",
    },
    {
      title: "成功/失败",
      key: "records",
      render: (_, record) => (
        <span>
          <Tag color="green">{record.successRecords}</Tag> /
          <Tag color="red">{record.failedRecords}</Tag>
        </span>
      ),
    },
    {
      title: "导入时间",
      dataIndex: "importedAt",
      key: "importedAt",
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Space size="small">
          {record.failedRecords > 0 && (
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleViewErrors(record.id)}
            >
              查看错误
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // 导入错误表格列
  const importErrorColumns: ColumnsType<ImportError> = [
    {
      title: "行号",
      dataIndex: "rowNumber",
      key: "rowNumber",
    },
    {
      title: "错误信息",
      dataIndex: "errorMessage",
      key: "errorMessage",
      render: (text) => <Tag color="red">{text}</Tag>,
    },
    {
      title: "原始数据",
      dataIndex: "rawData",
      key: "rawData",
      ellipsis: true,
    },
  ];

  // 上传文件属性
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    maxCount: 1,
    accept: '.xlsx,.xls,.pdf',
    fileList,
    beforeUpload: (file) => {
      const isExcelOrPdf =
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel' ||
        file.type === 'application/pdf';

      if (!isExcelOrPdf) {
        message.error('只能上传Excel或PDF文件!');
        return Upload.LIST_IGNORE;
      }

      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('文件大小不能超过10MB!');
        return Upload.LIST_IGNORE;
      }

      setFileList([file]);
      return false;
    },
    onRemove: () => {
      setFileList([]);
      return true;
    },
  };

  // 处理文件上传
  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.error('请先选择文件');
      return;
    }

    setUploading(true);

    try {
      // 创建FormData对象
      const formData = new FormData();
      formData.append('file', fileList[0] as any);

      // 发送上传请求
      const response = await fetch('/api/prices/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setCurrentStep(1);
        setImportResult(result.data);
        message.success('文件上传成功，正在解析数据');
      } else {
        message.error(result.message || '文件上传失败');
      }
    } catch (error) {
      console.error('上传文件错误:', error);
      message.error('文件上传失败，请稍后重试');
    } finally {
      setUploading(false);
    }
  };

  // 处理导入完成
  const handleImportComplete = () => {
    setCurrentStep(0);
    setFileList([]);
    setImportResult(null);
    setActiveTab("records");

    // 模拟刷新导入记录
    setImportRecords(mockImportRecords);
  };

  // 处理查看错误
  const handleViewErrors = async (importId: number) => {
    setSelectedImportId(importId);
    try {
      const response = await fetch(`/api/prices/imports/${importId}/errors`);
      const result = await response.json();

      if (result.success) {
        setImportErrors(result.data.errors);
      } else {
        message.error(result.message || "获取导入错误详情失败");
        // 使用模拟数据作为备选
        setImportErrors(mockImportErrors.filter(error => error.importId === importId));
      }
    } catch (error) {
      console.error('获取导入错误详情错误:', error);
      message.error('获取导入错误详情失败，请稍后重试');
      // 使用模拟数据作为备选
      setImportErrors(mockImportErrors.filter(error => error.importId === importId));
    }
  };

  // 处理下载模板
  const handleDownloadTemplate = async (type: string) => {
    try {
      const response = await fetch(`/api/prices/templates?type=${encodeURIComponent(type)}`, {
        method: 'GET',
      });

      if (response.ok) {
        // 创建下载链接
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${type}价格导入模板.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        message.success(`${type}模板下载成功`);
      } else {
        message.error(`${type}模板下载失败`);
      }
    } catch (error) {
      console.error('下载模板错误:', error);
      message.error(`${type}模板下载失败，请稍后重试`);
    }
  };

  // 加载导入记录
  const loadImportRecords = async () => {
    try {
      const response = await fetch('/api/prices/imports');
      const result = await response.json();

      if (result.success) {
        setImportRecords(result.data.imports);
      } else {
        message.error(result.message || "获取导入记录失败");
        // 使用模拟数据作为备选
        setImportRecords(mockImportRecords);
      }
    } catch (error) {
      console.error('加载导入记录错误:', error);
      message.error('加载导入记录失败，请稍后重试');
      // 使用模拟数据作为备选
      setImportRecords(mockImportRecords);
    }
  };

  // 组件加载时获取导入记录
  useEffect(() => {
    loadImportRecords();
  }, []);

  return (
    <div>
      <Title level={2}>价格导入</Title>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="导入价格" key="import" />
        <TabPane tab="导入记录" key="records" />
      </Tabs>

      {activeTab === "import" && (
        <Card>
          <Steps
            current={currentStep}
            items={[
              {
                title: '上传文件',
                description: '选择Excel或PDF文件',
              },
              {
                title: '数据解析',
                description: '系统解析价格数据',
              },
              {
                title: '导入完成',
                description: '查看导入结果',
              },
            ]}
            className="mb-8"
          />

          {currentStep === 0 && (
            <>
              <div className="mb-4">
                <Alert
                  message="导入说明"
                  description={
                    <div>
                      <p>1. 支持Excel(.xlsx, .xls)和PDF格式文件</p>
                      <p>2. 文件大小不超过10MB</p>
                      <p>3. 请按照模板格式填写数据，确保数据的准确性</p>
                      <p>4. 导入前请检查数据格式是否正确</p>
                    </div>
                  }
                  type="info"
                  showIcon
                />
              </div>

              <div className="mb-6">
                <Text strong>下载导入模板：</Text>
                <div className="mt-2">
                  <Space>
                    <Button
                      icon={<FileExcelOutlined />}
                      onClick={() => handleDownloadTemplate("传统物流")}
                    >
                      传统物流模板
                    </Button>
                    <Button
                      icon={<FileExcelOutlined />}
                      onClick={() => handleDownloadTemplate("FBA头程物流")}
                    >
                      FBA头程物流模板
                    </Button>
                    <Button
                      icon={<FileExcelOutlined />}
                      onClick={() => handleDownloadTemplate("增值服务")}
                    >
                      增值服务模板
                    </Button>
                  </Space>
                </div>
              </div>

              <Dragger {...uploadProps} className="mb-6">
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                <p className="ant-upload-hint">
                  支持Excel(.xlsx, .xls)和PDF格式文件，单个文件不超过10MB
                </p>
              </Dragger>

              <div className="text-center">
                <Button
                  type="primary"
                  onClick={handleUpload}
                  loading={uploading}
                  disabled={fileList.length === 0}
                >
                  开始导入
                </Button>
              </div>
            </>
          )}

          {currentStep === 1 && importResult && (
            <div className="text-center">
              <div className="mb-6">
                <Title level={4}>数据解析完成</Title>
                <div className="mt-4">
                  <div className="mb-2">
                    <Text>总记录数：</Text>
                    <Text strong>{importResult.totalRecords}</Text>
                  </div>
                  <div className="mb-2">
                    <Text>成功记录数：</Text>
                    <Text strong style={{ color: '#52c41a' }}>{importResult.successRecords}</Text>
                  </div>
                  <div className="mb-2">
                    <Text>失败记录数：</Text>
                    <Text strong style={{ color: '#f5222d' }}>{importResult.failedRecords}</Text>
                  </div>
                </div>
              </div>

              {importResult.failedRecords > 0 && (
                <div className="mb-6">
                  <Alert
                    message="存在导入错误"
                    description="部分数据导入失败，请查看错误详情"
                    type="warning"
                    showIcon
                  />
                  <div className="mt-4">
                    <Table
                      columns={importErrorColumns}
                      dataSource={importResult.errors}
                      rowKey="id"
                      pagination={false}
                      size="small"
                    />
                  </div>
                </div>
              )}

              <Button
                type="primary"
                onClick={handleImportComplete}
              >
                完成
              </Button>
            </div>
          )}
        </Card>
      )}

      {activeTab === "records" && (
        <Card>
          <Table
            columns={importRecordColumns}
            dataSource={importRecords}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />

          {selectedImportId && importErrors.length > 0 && (
            <>
              <Divider>导入错误详情</Divider>
              <Table
                columns={importErrorColumns}
                dataSource={importErrors}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </>
          )}
        </Card>
      )}
    </div>
  );
}
