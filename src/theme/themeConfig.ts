import type { ThemeConfig } from 'antd';

/**
 * 全局主题配置
 * 用于定制Ant Design组件的样式
 */
const themeConfig: ThemeConfig = {
  token: {
    fontSize: 14,
    colorPrimary: '#1677ff',
    borderRadius: 4,
  },
  components: {
    Layout: {
      headerBg: '#ffffff', // 修改为白色
      bodyBg: '#f0f2f5',
      triggerBg: '#002140',
      headerHeight: 64,
      headerPadding: '0 20px',
    },
    Menu: {
      itemBg: 'transparent',
      itemColor: 'rgba(255, 255, 255, 0.65)',
      itemSelectedColor: '#fff',
      itemSelectedBg: '#1677ff',
      itemHoverColor: '#fff',
    },
    Table: {
      colorBgContainer: '#fff',
      fontSize: 14,
    },
    Card: {
      colorBgContainer: '#fff',
      boxShadowTertiary: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
    },
    Button: {
      controlHeight: 32,
      fontSize: 14,
    },
    Input: {
      controlHeight: 32,
      fontSize: 14,
    },
    Select: {
      controlHeight: 32,
      fontSize: 14,
    },
    DatePicker: {
      controlHeight: 32,
      fontSize: 14,
    },
  },
};

export default themeConfig;
