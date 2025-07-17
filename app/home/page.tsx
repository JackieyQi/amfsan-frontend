"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getUserInfo,
  logoutUser,
  isLoggedIn,
  getMarketSymbols,
  addMarketSymbol,
  deleteMarketSymbol,
  type UserDetails,
  type SymbolData,
} from "@/lib/api";
import { safeJsonParse, safeText } from "@/lib/security";
import { ResponseDialog } from "@/components/response-dialog";
import { timeStamp } from "console";

// 定义用户类型
interface UserInfo {
  user_id: string;
  email?: string;
  token: string;
  expires_at: number;
}

export default function HomePage() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [symbols, setSymbols] = useState<SymbolData[]>([]);
  const [newSymbol, setNewSymbol] = useState("");
  const [isAddingSymbol, setIsAddingSymbol] = useState(false);
  const [isDeletingSymbol, setIsDeletingSymbol] = useState<
    Record<string, boolean>
  >({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogResponse, setDialogResponse] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // 检查用户是否已登录
    if (!isLoggedIn()) {
      console.log("用户未登录，重定向到登录页");
      toast.error("请先登录");
      router.push("/");
      return;
    }

    console.log("用户已登录，获取用户信息");

    // 从localStorage获取用户基本信息
    const storedUserInfo = localStorage.getItem("userInfo");
    if (storedUserInfo) {
      try {
        // 使用安全的JSON解析
        const parsedUserInfo = safeJsonParse<UserInfo>(storedUserInfo, {
          user_id: "",
          token: "",
          expires_at: 0,
        });
        setUserInfo(parsedUserInfo);
        // console.log("成功获取用户信息", parsedUserInfo);
      } catch (error) {
        // console.error("解析用户信息失败", error);
      }
    }

    // 获取用户详细信息和市场符号
    // Promise.all([fetchUserDetails(), fetchMarketSymbols()])
    Promise.all([fetchMarketSymbols()])
      .then(() => console.log("成功获取用户详情和市场符号"))
      .catch((err) => console.error("获取数据失败", err))
      .finally(() => setIsLoading(false));
  }, [router]);

  const fetchUserDetails = async () => {
    try {
      // 恢复实际API调用
      const details = await getUserInfo();

      // 验证返回的数据包含必要的字段
      if (!details || typeof details !== "object" || !("email" in details)) {
        throw new Error("获取的用户信息格式不正确");
      }

      setUserDetails(details);
      return details;
    } catch (error) {
      // 如果获取用户详情失败，可能是token过期或无效
      // console.error("获取用户信息失败:", error);
      toast.error("获取用户信息失败，请重新登录");
      // 清除本地存储并重定向到登录页
      localStorage.removeItem("userInfo");
      router.push("/");
      throw error;
    }
  };

  const fetchMarketSymbols = async () => {
    try {
      // 恢复实际API调用
      const data = await getMarketSymbols();
      setSymbols(data);
      return data;
    } catch (error) {
      console.error("获取市场符号失败:", error);
      toast.error("获取市场符号失败");
      return [];
    }
  };

  const handleAddSymbol = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newSymbol.trim()) {
      toast.error("请输入有效的符号");
      return;
    }

    setIsAddingSymbol(true);

    try {
      // 恢复实际API调用
      await addMarketSymbol(newSymbol.trim());
      toast.success(`成功添加符号: ${newSymbol}`);
      setNewSymbol("");
      // 重新获取符号列表
      fetchMarketSymbols();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "添加符号失败");
    } finally {
      setIsAddingSymbol(false);
    }
  };

  const handleDeleteSymbol = async (symbol: string) => {
    setIsDeletingSymbol((prev) => ({ ...prev, [symbol]: true }));

    try {
      // 恢复实际API调用
      const response = await deleteMarketSymbol(symbol);
      // toast.success(`成功删除符号: ${symbol}`);

      setDialogResponse({
        symbol,
        response,
        // timeStamp: new Date().toISOString(),
      });
      setDialogOpen(true);

      // 更新本地状态，移除已删除的符号
      setSymbols((prev) => prev.filter((item) => item.symbol !== symbol));
    } catch (error) {
      // toast.error(error instanceof Error ? error.message : "删除符号失败");
      // 显示错误响应弹框
      setDialogResponse({
        symbol,
        error: error instanceof Error ? error.message : "删除符号失败",
        // timestamp: new Date().toISOString(),
      });
      setDialogOpen(true);
    } finally {
      setIsDeletingSymbol((prev) => ({ ...prev, [symbol]: false }));
    }
  };

  const handleLogout = async () => {
    try {
      // 恢复实际API调用
      await logoutUser();
      toast.success("已成功退出登录");
    } catch (error) {
      toast.error("退出登录失败，但已清除本地会话");
    } finally {
      router.push("/");
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        加载中...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">JUST HODL IT</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm">
              你好，{safeText(userDetails?.email || userInfo?.email || "用户")}
            </span>
            <Button onClick={handleLogout} variant="outline" size="sm">
              退出登录
            </Button>
          </div>
        </div>
        <div className="flex justify-items-center mb-6">
          <Button
            onClick={() => router.push("/backtest")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            策略实盘
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>添加市场符号</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddSymbol} className="flex gap-2">
              <Input
                placeholder="输入符号，例如: btcusdt"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={isAddingSymbol}>
                {isAddingSymbol ? "添加中..." : "添加"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>市场符号列表</CardTitle>
          </CardHeader>
          <CardContent>
            {symbols.length === 0 ? (
              <div className="text-center py-4 text-gray-500">暂无数据</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 text-left">符号</th>
                      <th className="px-4 py-2 text-left">状态</th>
                      <th className="px-4 py-2 text-left">创建时间</th>
                      <th className="px-4 py-2 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {symbols.map((item) => (
                      <tr key={item.symbol} className="border-t">
                        <td className="px-4 py-2">{item.symbol}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs ${
                              item.is_valid
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {item.is_valid ? "有效" : "无效"}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {formatTimestamp(item.create_ts)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteSymbol(item.symbol)}
                            disabled={isDeletingSymbol[item.symbol]}
                          >
                            {isDeletingSymbol[item.symbol]
                              ? "删除中..."
                              : "删除"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* 响应弹框 */}
      <ResponseDialog
        title="删除符号响应"
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        response={dialogResponse}
      />
    </div>
  );
}
