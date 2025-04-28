"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  Card, 
  Typography, 
  Form, 
  Input, 
  Button, 
  message, 
  Tabs, 
  Divider, 
  Avatar, 
  Row, 
  Col,
  Descriptions
} from "antd";
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined } from "@ant-design/icons";
import axios from "axios";

const { Title } = Typography;
const { TabPane } = Tabs;

export default function ProfilePage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [passwordForm] = Form.useForm();
  const [profileForm] = Form.useForm();
  const [userData, setUserData] = useState<any>(null);

  // 获取用户详情
  const fetchUserData = async () => {
    if (!session?.user?.id) return;
    
    try {
      setLoading(true);
      const { data } = await axios.get(`/api/users/${session.user.id}`);
      if (data.success) {
        setUserData(data.data);
        profileForm.setFieldsValue({
          email: data.data.email,
          realName: data.data.realName,
          phone: data.data.phone,
        });
      }
    } catch (error) {
      console.error("获取用户信息错误:", error);
      message.error("获取用户信息失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchUserData();
    }
  }, [session]);

  // 更新个人信息
  const handleUpdateProfile = async (values: any) => {
    try {
      setLoading(true);
      const { data } = await axios.put(`/api/users/${session?.user.id}`, {
        ...values,
        roleIds: userData?.roleIds, // 保持原有角色不变
      });
      
      if (data.success) {
        message.success("个人信息更新成功");
        fetchUserData(); // 重新获取用户信息
      } else {
        message.error(data.message || "更新失败");
      }
    } catch (error) {
      console.error("更新个人信息错误:", error);
      message.error("更新个人信息失败");
    } finally {
      setLoading(false);
    }
  };

  // 修改密码
  const handleChangePassword = async (values: any) => {
    try {
      setLoading(true);
      const { data } = await axios.put(`/api/users/${session?.user.id}/password`, {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      
      if (data.success) {
        message.success("密码修改成功");
        passwordForm.resetFields();
      } else {
        message.error(data.message || "密码修改失败");
      }
    } catch (error) {
      console.error("修改密码错误:", error);
      message.error("修改密码失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <Title level={2}>个人信息</Title>
      
      <Row gutter={24}>
        <Col xs={24} md={8}>
          <Card className="mb-6">
            <div className="text-center">
              <Avatar 
                size={100} 
                icon={<UserOutlined />} 
                style={{ backgroundColor: '#1677ff' }}
              />
              <Title level={4} className="mt-4 mb-1">
                {userData?.realName || userData?.username || session?.user?.name || "用户"}
              </Title>
              <p className="text-gray-500">{userData?.email || session?.user?.email}</p>
              
              <Divider />
              
              <Descriptions column={1} size="small">
                <Descriptions.Item label="用户名">{userData?.username}</Descriptions.Item>
                <Descriptions.Item label="用户类型">
                  {userData?.userType === 1 ? "内部用户" : "外部用户"}
                </Descriptions.Item>
                <Descriptions.Item label="所属组织">
                  {userData?.organizationName || "未分配"}
                </Descriptions.Item>
                <Descriptions.Item label="角色">
                  {userData?.roles?.join(", ") || "无角色"}
                </Descriptions.Item>
                <Descriptions.Item label="最后登录">
                  {userData?.lastLoginTime 
                    ? new Date(userData.lastLoginTime).toLocaleString() 
                    : "未记录"}
                </Descriptions.Item>
              </Descriptions>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} md={16}>
          <Card>
            <Tabs defaultActiveKey="profile">
              <TabPane tab="基本信息" key="profile">
                <Form
                  form={profileForm}
                  layout="vertical"
                  onFinish={handleUpdateProfile}
                >
                  <Form.Item
                    name="email"
                    label="邮箱"
                    rules={[
                      { required: true, message: "请输入邮箱" },
                      { type: "email", message: "请输入有效的邮箱地址" }
                    ]}
                  >
                    <Input 
                      prefix={<MailOutlined className="text-gray-400" />} 
                      placeholder="邮箱"
                    />
                  </Form.Item>
                  
                  <Form.Item
                    name="realName"
                    label="姓名"
                  >
                    <Input 
                      prefix={<UserOutlined className="text-gray-400" />} 
                      placeholder="姓名"
                    />
                  </Form.Item>
                  
                  <Form.Item
                    name="phone"
                    label="电话"
                  >
                    <Input 
                      prefix={<PhoneOutlined className="text-gray-400" />} 
                      placeholder="电话"
                    />
                  </Form.Item>
                  
                  <Form.Item>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      loading={loading}
                    >
                      保存修改
                    </Button>
                  </Form.Item>
                </Form>
              </TabPane>
              
              <TabPane tab="修改密码" key="password">
                <Form
                  form={passwordForm}
                  layout="vertical"
                  onFinish={handleChangePassword}
                >
                  <Form.Item
                    name="oldPassword"
                    label="当前密码"
                    rules={[{ required: true, message: "请输入当前密码" }]}
                  >
                    <Input.Password 
                      prefix={<LockOutlined className="text-gray-400" />} 
                      placeholder="当前密码"
                    />
                  </Form.Item>
                  
                  <Form.Item
                    name="newPassword"
                    label="新密码"
                    rules={[
                      { required: true, message: "请输入新密码" },
                      { min: 6, message: "密码长度不能少于6个字符" }
                    ]}
                  >
                    <Input.Password 
                      prefix={<LockOutlined className="text-gray-400" />} 
                      placeholder="新密码"
                    />
                  </Form.Item>
                  
                  <Form.Item
                    name="confirmPassword"
                    label="确认新密码"
                    dependencies={['newPassword']}
                    rules={[
                      { required: true, message: "请确认新密码" },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('newPassword') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('两次输入的密码不一致'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password 
                      prefix={<LockOutlined className="text-gray-400" />} 
                      placeholder="确认新密码"
                    />
                  </Form.Item>
                  
                  <Form.Item>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      loading={loading}
                    >
                      修改密码
                    </Button>
                  </Form.Item>
                </Form>
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
