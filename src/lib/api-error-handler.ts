import { AxiosError } from 'axios';

/**
 * API错误类型
 */
export interface ApiError {
  status: number;
  message: string;
  details?: any;
}

/**
 * API错误处理器
 * 用于统一处理API错误
 */
export class ApiErrorHandler {
  /**
   * 处理Axios错误
   * @param error Axios错误对象
   * @returns 格式化后的API错误对象
   */
  static handleAxiosError(error: AxiosError): ApiError {
    if (error.response) {
      // 服务器返回了错误响应
      const status = error.response.status;
      let message = '请求失败';
      let details = null;

      // 尝试从响应中获取错误信息
      if (error.response.data) {
        const data = error.response.data as any;
        if (data.message) {
          message = data.message;
        }
        if (data.errors || data.details || data.conflicts) {
          details = data.errors || data.details || data.conflicts;
        }
      }

      // 根据状态码定制错误信息
      switch (status) {
        case 400:
          message = message || '请求参数错误';
          break;
        case 401:
          message = '未授权，请重新登录';
          break;
        case 403:
          message = '没有权限执行此操作';
          break;
        case 404:
          message = '请求的资源不存在';
          break;
        case 409:
          message = '数据冲突，请检查输入';
          break;
        case 500:
          message = '服务器内部错误';
          break;
        default:
          message = message || `请求失败，状态码: ${status}`;
      }

      return {
        status,
        message,
        details
      };
    } else if (error.request) {
      // 请求已发送但没有收到响应
      return {
        status: 0,
        message: '网络错误，无法连接到服务器'
      };
    } else {
      // 请求配置出错
      return {
        status: 0,
        message: `请求配置错误: ${error.message}`
      };
    }
  }

  /**
   * 处理通用错误
   * @param error 任意错误对象
   * @returns 格式化后的API错误对象
   */
  static handleError(error: any): ApiError {
    if (error instanceof AxiosError) {
      return this.handleAxiosError(error);
    }

    return {
      status: 0,
      message: error?.message || '发生未知错误'
    };
  }

  /**
   * 获取错误详情的格式化文本
   * @param error API错误对象
   * @returns 格式化后的错误详情文本
   */
  static getErrorDetailsText(error: ApiError): string | null {
    if (!error.details) {
      return null;
    }

    if (Array.isArray(error.details)) {
      return error.details.join('\n');
    }

    if (typeof error.details === 'string') {
      return error.details;
    }

    if (typeof error.details === 'object') {
      return Object.entries(error.details)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    }

    return JSON.stringify(error.details);
  }
}
