import config from "./config";
import { getAuthToken } from "./api-utils";

// 回测记录类型
export interface BacktestRecord {
  id: string;
  symbol: string;
  buy_price: string;
  buy_ts: number;
  sell_price: string;
  sell_ts: number;
  hold_time: number;
  profit_percent: string;
  status: number;
  status_text: string;
}

export interface BacktestDetailRecord {
  id: string;
  symbol: string;
  bid_curr_price: string;
  bid_price: string;
  bid_ts: number;
  bid_plot_type: number;
  bid_plot_msg: string;
  buy_price: string;
  buy_ts: number;
  ask_curr_price: string;
  ask_price: string;
  ask_ts: number;
  ask_plot_type: number;
  ask_plot_msg: string;
  sell_price: string;
  sell_ts: number;
  hold_time: number;
  profit_percent: string;
  status: number;
  status_text: string;
}

// 分页信息类型
export interface PaginationInfo {
  current_page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
}

// 回测记录响应类型
export interface BacktestResponse {
  records: BacktestRecord[];
  pagination: PaginationInfo;
}

// 获取回测记录列表
export async function getBacktestRecords(
  page = 1,
  pageSize = 10,
  symbol?: string,
  status?: Number
): Promise<BacktestResponse> {
  try {
    // 构建查询参数
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    // 添加可选参数
    if (symbol) params.append("symbol", symbol);
    if (status !== undefined) params.append("status", status.toString());

    const url = `${
      config.apiBaseUrl
    }/api/plot/backtest/record/list?${params.toString()}`;
    const token = getAuthToken();

    if (!token) {
      throw new Error("未找到认证令牌");
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      mode: "cors",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `请求失败: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();

    if (result.code !== 0) {
      throw new Error(result.message || "请求失败");
    }

    // 处理没有数据的情况
    if (!result.data || !result.data.records) {
      return {
        records: [],
        pagination: {
          current_page: page,
          page_size: pageSize,
          total_count: 0,
          total_pages: 0,
        },
      };
    }

    return result.data;
  } catch (error) {
    console.error("获取回测记录失败:", error);
    throw error;
  }
}

// 获取回测详情
export async function getBacktestDetail(
  symbol: string,
  recordId?: string
): Promise<BacktestDetailRecord> {
  try {
    // 构建查询参数
    const params = new URLSearchParams({ symbol });
    if (recordId) params.append("id", recordId);

    const url = `${
      config.apiBaseUrl
    }/api/plot/backtest/record/detail?${params.toString()}`;
    const token = getAuthToken();

    if (!token) {
      throw new Error("未找到认证令牌");
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      mode: "cors",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `请求失败: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();

    if (result.code !== 0) {
      throw new Error(result.message || "请求失败");
    }

    return result.data || {};
  } catch (error) {
    console.error("获取回测详情失败:", error);
    throw error;
  }
}

// 获取状态文本
export function getStatusText(status: number): string {
  const statusMap: Record<number, string> = {
    0: "挂买单中",
    1: "买入成功，等待卖出",
    2: "买入失败",
    3: "挂卖单中",
    4: "卖出成功",
    5: "挂卖单失败，以市价卖出",
  };
  return statusMap[status] || "未知状态";
}

// 格式化时间戳
export function formatTimestamp(timestamp: number): string {
  if (!timestamp) return "-";
  return new Date(timestamp * 1000).toLocaleString();
}
