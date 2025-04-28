"use client";

import { useState } from "react";
import { 
  Upload, 
  Button, 
  Card, 
  message, 
  Typography, 
  Steps, 
  Radio, 
  Divider,
  Table,
  Alert,
  Space
} from "antd";
import { 
  InboxOutlined, 
  FileExcelOutlined, 
  FilePdfOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  LoadingOutlined
} from "@ant-design/icons";
import axios from "axios";
import { useRouter } from "next/navigation";

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { Step } = Steps;

export default function ImportPricePage() {
  const [fileType, setFileType] = useState("excel");
  const [currentStep, setCurrentStep] = useState(0);
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const router = useRouter();

  // 文件上传属性
  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: fileType === 'excel' ? '.xlsx,.xls' : '.pdf',
    fileList,
    beforeUpload: (file) => {
      // 验证文件类型
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                      file.type === 'application/vnd.ms-excel';
      const isPdf = file.type === 'application/pdf';
      
      if (fileType === 'excel' && !isExcel) {
        message.error('只能上传Excel文件!');
        return Upload.LIST_IGNORE;
      }
      
      if (fileType === 'pdf' && !isPdf) {
        message.error('只能上传PDF文件!');
        return Upload.LIST_IGNORE;
      }
      
      // 验证文件大小 (限制为10MB)
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('文件大小不能超过10MB!');
        return Upload.LIST_IGNORE;
      }
      
      setFileList([file]);
      return false; // 阻止自动上传
    },
    onRemove: () => {
      setFileList([]);
    },
  };

  // 处理文件类型变更
  const handleFileTypeChange = (e) => {
    setFileType(e.target.value);
    setFileList([]);
  };

  // 处理文件上传
  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.error('请先选择文件');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileList[0]);
    formData.append('fileType', fileType.toUpperCase());

    setUploading(true);
    try {
      const { data } = await axios.post('/api/prices/import', formData);
      
      if (data.success) {
        message.success('文件上传成功，正在处理数据');
        setImportResult(data.data);
        
        // 如果有错误记录，获取错误详情
        if (data.data.failedRecords > 0) {
          const errorsResponse = await axios.get(`/api/prices/import/errors/${data.data.id}`);
          if (errorsResponse.data.success) {
            setImportErrors(errorsResponse.data.data);
          }
        }
        
        setCurrentStep(1);
      } else {
        message.error(data.message || '上传失败');
      }
    } catch (error) {
      console.error('上传错误:', error);
      message.error('上传失败');
    } finally {
      setUploading(false);
    }
  };

  // 错误记录表格列
  const errorColumns = [
    {
      title: '行号',
      dataIndex: 'rowNumber',
      key: 'rowNumber',
    },
    {
      title: '错误信息',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
    },
    {
      title: '原始数据',
      dataIndex: 'rawData',
      key: 'rawData',
      ellipsis: true,
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
        <Title level={2} className="m-0">导入价格</Title>
      </div>

      <Card>
        <Steps current={currentStep} className="mb-8">
          <Step title="上传文件" description="选择并上传价格文件" />
          <Step title="导入结果" description="查看导入结果" />
        </Steps>

        {currentStep === 0 && (
          <>
            <div className="mb-6">
              <Title level={4}>选择文件类型</Title>
              <Radio.Group value={fileType} onChange={handleFileTypeChange}>
                <Radio.Button value="excel">
                  <FileExcelOutlined /> Excel文件
                </Radio.Button>
                <Radio.Button value="pdf">
                  <FilePdfOutlined /> PDF文件
                </Radio.Button>
              </Radio.Group>
            </div>

            <Dragger {...uploadProps} className="mb-6">
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持{fileType === 'excel' ? 'Excel (.xlsx, .xls)' : 'PDF (.pdf)'} 格式文件，文件大小不超过10MB
              </p>
            </Dragger>

            <div className="text-center">
              <Button
                type="primary"
                onClick={handleUpload}
                disabled={fileList.length === 0}
                loading={uploading}
                size="large"
              >
                开始导入
              </Button>
            </div>
          </>
        )}

        {currentStep === 1 && importResult && (
          <>
            <div className="text-center mb-8">
              {importResult.importStatus === 1 ? (
                <CheckCircleOutlined style={{ fontSize: 72, color: '#52c41a' }} />
              ) : importResult.importStatus === 0 ? (
                <LoadingOutlined style={{ fontSize: 72, color: '#1890ff' }} />
              ) : (
                <div className="text-red-500 text-5xl">!</div>
              )}
              
              <Title level={3} className="mt-4">
                {importResult.importStatus === 1 ? '导入完成' : 
                 importResult.importStatus === 0 ? '正在处理' : '导入失败'}
              </Title>
            </div>

            <Card className="mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Text type="secondary">文件名</Text>
                  <div>{importResult.fileName}</div>
                </div>
                <div>
                  <Text type="secondary">文件类型</Text>
                  <div>{importResult.fileType}</div>
                </div>
                <div>
                  <Text type="secondary">文件大小</Text>
                  <div>{(importResult.fileSize / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <div>
                  <Text type="secondary">导入时间</Text>
                  <div>{new Date(importResult.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <Text type="secondary">总记录数</Text>
                  <div>{importResult.totalRecords || '处理中'}</div>
                </div>
                <div>
                  <Text type="secondary">成功记录数</Text>
                  <div>{importResult.successRecords || '处理中'}</div>
                </div>
                <div>
                  <Text type="secondary">失败记录数</Text>
                  <div>{importResult.failedRecords || '处理中'}</div>
                </div>
                <div>
                  <Text type="secondary">状态</Text>
                  <div>
                    {importResult.importStatus === 1 ? '成功' : 
                     importResult.importStatus === 0 ? '处理中' : '失败'}
                  </div>
                </div>
              </div>
            </Card>

            {importResult.errorMessage && (
              <Alert
                message="导入错误"
                description={importResult.errorMessage}
                type="error"
                showIcon
                className="mb-6"
              />
            )}

            {importErrors.length > 0 && (
              <>
                <Title level={4}>错误记录</Title>
                <Table
                  columns={errorColumns}
                  dataSource={importErrors}
                  rowKey="id"
                  pagination={{ pageSize: 5 }}
                  className="mb-6"
                />
              </>
            )}

            <div className="text-center">
              <Space>
                <Button type="primary" onClick={() => router.push("/dashboard/prices")}>
                  返回价格列表
                </Button>
                <Button onClick={() => {
                  setCurrentStep(0);
                  setFileList([]);
                  setImportResult(null);
                  setImportErrors([]);
                }}>
                  重新导入
                </Button>
              </Space>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
