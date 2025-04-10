import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// 用于合并Tailwind类名
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// API响应类型
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

// 处理API响应的工具函数
export async function handleApiResponse<T>(response: Response): Promise<T> {
  const result: ApiResponse<T> = await response.json();

  if (result.code !== 0) {
    throw new Error(result.message || "请求失败");
  }

  return result.data;
}
