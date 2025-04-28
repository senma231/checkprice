import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiErrorHandler, ApiError } from './api-error-handler';

// 创建axios实例
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证令牌等
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * API客户端
 * 用于统一处理API请求
 */
export class ApiClient {
  /**
   * 发送GET请求
   * @param url 请求URL
   * @param params 查询参数
   * @param config Axios配置
   * @returns 响应数据
   */
  static async get<T = any>(
    url: string,
    params?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await apiClient.get(url, {
        params,
        ...config,
      });
      return response.data;
    } catch (error) {
      throw ApiErrorHandler.handleError(error);
    }
  }

  /**
   * 发送POST请求
   * @param url 请求URL
   * @param data 请求数据
   * @param config Axios配置
   * @returns 响应数据
   */
  static async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await apiClient.post(url, data, config);
      return response.data;
    } catch (error) {
      throw ApiErrorHandler.handleError(error);
    }
  }

  /**
   * 发送PUT请求
   * @param url 请求URL
   * @param data 请求数据
   * @param config Axios配置
   * @returns 响应数据
   */
  static async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await apiClient.put(url, data, config);
      return response.data;
    } catch (error) {
      throw ApiErrorHandler.handleError(error);
    }
  }

  /**
   * 发送DELETE请求
   * @param url 请求URL
   * @param config Axios配置
   * @returns 响应数据
   */
  static async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await apiClient.delete(url, config);
      return response.data;
    } catch (error) {
      throw ApiErrorHandler.handleError(error);
    }
  }
}

export default ApiClient;
