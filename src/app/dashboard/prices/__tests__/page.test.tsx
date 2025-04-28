import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/utils/test-utils';
import PricesPage from '../page';
import axios from 'axios';

// 模拟axios
jest.mock('axios');

describe('PricesPage', () => {
  beforeEach(() => {
    // 模拟axios.get返回价格列表
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: {
          prices: [
            {
              id: 1,
              serviceType: 1,
              originRegion: { name: '中国' },
              destinationRegion: { name: '美国' },
              weightStart: 0,
              weightEnd: 10,
              price: 100,
              currency: 'CNY',
              priceUnit: 'kg',
              effectiveDate: '2023-01-01',
              isCurrent: true,
            },
            {
              id: 2,
              serviceType: 2,
              originRegion: { name: '中国' },
              destinationRegion: { name: '英国' },
              weightStart: 0,
              weightEnd: 20,
              price: 150,
              currency: 'CNY',
              priceUnit: 'kg',
              effectiveDate: '2023-01-01',
              isCurrent: true,
            },
          ],
          pagination: {
            current: 1,
            total: 2,
          },
        },
      },
    });
  });

  it('should render the prices page', async () => {
    render(<PricesPage />);
    
    // 验证标题
    expect(screen.getByText('价格管理')).toBeInTheDocument();
    
    // 验证加载价格列表
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/prices', expect.any(Object));
    });
    
    // 验证价格列表显示
    await waitFor(() => {
      expect(screen.getByText('中国')).toBeInTheDocument();
      expect(screen.getByText('美国')).toBeInTheDocument();
      expect(screen.getByText('英国')).toBeInTheDocument();
    });
  });

  it('should handle search form submission', async () => {
    render(<PricesPage />);
    
    // 等待页面加载完成
    await waitFor(() => {
      expect(screen.getByText('中国')).toBeInTheDocument();
    });
    
    // 重置axios.get模拟
    (axios.get as jest.Mock).mockClear();
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: {
          prices: [
            {
              id: 1,
              serviceType: 1,
              originRegion: { name: '中国' },
              destinationRegion: { name: '美国' },
              weightStart: 0,
              weightEnd: 10,
              price: 100,
              currency: 'CNY',
              priceUnit: 'kg',
              effectiveDate: '2023-01-01',
              isCurrent: true,
            },
          ],
          pagination: {
            current: 1,
            total: 1,
          },
        },
      },
    });
    
    // 选择服务类型
    const serviceTypeSelect = screen.getByLabelText('服务类型');
    fireEvent.mouseDown(serviceTypeSelect);
    await waitFor(() => {
      fireEvent.click(screen.getByText('物流服务'));
    });
    
    // 提交搜索表单
    const searchButton = screen.getByText('搜索');
    fireEvent.click(searchButton);
    
    // 验证搜索请求
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/prices', {
        params: expect.objectContaining({
          serviceType: '1',
          current: 1,
        }),
      });
    });
  });

  it('should handle delete price', async () => {
    // 模拟axios.delete返回成功
    (axios.delete as jest.Mock).mockResolvedValue({
      data: {
        success: true,
      },
    });
    
    render(<PricesPage />);
    
    // 等待页面加载完成
    await waitFor(() => {
      expect(screen.getByText('中国')).toBeInTheDocument();
    });
    
    // 点击删除按钮
    const deleteButtons = screen.getAllByText('删除');
    fireEvent.click(deleteButtons[0]);
    
    // 点击确认
    const confirmButton = screen.getByText('确定');
    fireEvent.click(confirmButton);
    
    // 验证删除请求
    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith('/api/prices/1');
    });
    
    // 验证重新加载价格列表
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2);
    });
  });

  it('should handle table pagination', async () => {
    render(<PricesPage />);
    
    // 等待页面加载完成
    await waitFor(() => {
      expect(screen.getByText('中国')).toBeInTheDocument();
    });
    
    // 重置axios.get模拟
    (axios.get as jest.Mock).mockClear();
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: {
          prices: [
            {
              id: 3,
              serviceType: 1,
              originRegion: { name: '美国' },
              destinationRegion: { name: '中国' },
              weightStart: 0,
              weightEnd: 10,
              price: 120,
              currency: 'USD',
              priceUnit: 'kg',
              effectiveDate: '2023-01-01',
              isCurrent: true,
            },
          ],
          pagination: {
            current: 2,
            total: 3,
          },
        },
      },
    });
    
    // 点击下一页
    const nextPageButton = screen.getByTitle('下一页');
    fireEvent.click(nextPageButton);
    
    // 验证分页请求
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/prices', {
        params: expect.objectContaining({
          current: 2,
        }),
      });
    });
  });
});
