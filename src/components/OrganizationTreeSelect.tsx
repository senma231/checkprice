"use client";

import { useState, useEffect } from "react";
import { TreeSelect, Spin, message } from "antd";
import axios from "axios";

interface OrganizationTreeSelectProps {
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  placeholder?: string;
  multiple?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
  allowClear?: boolean;
  showSearch?: boolean;
  treeDefaultExpandAll?: boolean;
  treeCheckable?: boolean;
  treeCheckStrictly?: boolean;
}

/**
 * 组织机构树形选择器组件
 * 支持单选和多选模式
 */
const OrganizationTreeSelect: React.FC<OrganizationTreeSelectProps> = ({
  value,
  onChange,
  placeholder = "请选择组织机构",
  multiple = false,
  disabled = false,
  style,
  className,
  allowClear = true,
  showSearch = true,
  treeDefaultExpandAll = false,
  treeCheckable = false,
  treeCheckStrictly = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [treeData, setTreeData] = useState<any[]>([]);

  // 获取组织机构树形数据
  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/organizations");
      if (data.success) {
        const organizations = data.data || [];
        const treeData = buildOrganizationTree(organizations);
        setTreeData(treeData);
      } else {
        message.error(data.message || "获取组织机构失败");
      }
    } catch (error) {
      console.error("获取组织机构错误:", error);
      message.error("获取组织机构失败");
    } finally {
      setLoading(false);
    }
  };

  // 构建组织机构树形结构
  const buildOrganizationTree = (organizations: any[]) => {
    // 按层级排序
    const sortedOrgs = [...organizations].sort((a, b) => a.level - b.level);
    
    // 创建ID到节点的映射
    const orgMap = new Map();
    sortedOrgs.forEach(org => {
      orgMap.set(org.id, {
        ...org,
        title: org.name,
        value: org.id.toString(),
        key: org.id.toString(),
        children: [],
        isLeaf: true,
      });
    });
    
    // 构建树形结构
    const rootNodes: any[] = [];
    sortedOrgs.forEach(org => {
      const node = orgMap.get(org.id);
      
      if (org.parentId) {
        const parentNode = orgMap.get(org.parentId);
        if (parentNode) {
          parentNode.children.push(node);
          parentNode.isLeaf = false;
        } else {
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });
    
    // 标记有子节点的节点
    sortedOrgs.forEach(org => {
      const node = orgMap.get(org.id);
      if (node.children && node.children.length > 0) {
        node.isLeaf = false;
      }
    });
    
    return rootNodes;
  };

  // 首次加载获取组织机构数据
  useEffect(() => {
    fetchOrganizations();
  }, []);

  // 处理选择变化
  const handleChange = (newValue: string | string[]) => {
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <Spin spinning={loading}>
      <TreeSelect
        value={value}
        onChange={handleChange}
        style={{ width: "100%", ...style }}
        className={className}
        dropdownStyle={{ maxHeight: 400, overflow: "auto" }}
        treeData={treeData}
        placeholder={placeholder}
        treeDefaultExpandAll={treeDefaultExpandAll}
        multiple={multiple}
        disabled={disabled}
        allowClear={allowClear}
        showSearch={showSearch}
        treeCheckable={treeCheckable}
        treeCheckStrictly={treeCheckStrictly}
        filterTreeNode={(inputValue, treeNode) => {
          return (treeNode?.title as string)
            .toLowerCase()
            .includes(inputValue.toLowerCase());
        }}
      />
    </Spin>
  );
};

export default OrganizationTreeSelect;
