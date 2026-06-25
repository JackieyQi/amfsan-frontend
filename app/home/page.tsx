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
  getCandidateSymbols,
  getCandidateTopPriceNoticeSetting,
  updateCandidateTopPriceNoticeSetting,
  setMarketPriceAlert,
  addMarketSymbol,
  deleteMarketSymbol,
  type UserDetails,
  type SymbolData,
  type MarketPriceAlertResponse,
} from "@/lib/api";
import { safeJsonParse, safeText } from "@/lib/security";
import { ResponseDialog } from "@/components/response-dialog";

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
  const [candidateSymbols, setCandidateSymbols] = useState<SymbolData[]>([]);
  const [candidateFilter, setCandidateFilter] = useState("");
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [candidateTopPriceNoticeEnabled, setCandidateTopPriceNoticeEnabled] =
    useState(false);
  const [
    isLoadingCandidateTopPriceNotice,
    setIsLoadingCandidateTopPriceNotice,
  ] = useState(false);
  const [
    isUpdatingCandidateTopPriceNotice,
    setIsUpdatingCandidateTopPriceNotice,
  ] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [priceAlertSymbol, setPriceAlertSymbol] = useState("");
  const [limitLowPrice, setLimitLowPrice] = useState("");
  const [limitHighPrice, setLimitHighPrice] = useState("");
  const [isSavingPriceAlert, setIsSavingPriceAlert] = useState(false);
  const [priceAlertResponse, setPriceAlertResponse] =
    useState<MarketPriceAlertResponse | null>(null);
  const [isAddingSymbol, setIsAddingSymbol] = useState(false);
  const [isDeletingSymbol, setIsDeletingSymbol] = useState<
    Record<string, boolean>
  >({});
  const [isAddingCandidateSymbol, setIsAddingCandidateSymbol] = useState<
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

    // 获取用户详细信息、当前监控列表、候选币种和候选通知开关
    // Promise.all([fetchUserDetails(), fetchMarketSymbols(), fetchCandidateSymbols(), fetchCandidateTopPriceNoticeSetting()])
    Promise.all([
      fetchMarketSymbols(),
      fetchCandidateSymbols(),
      fetchCandidateTopPriceNoticeSetting(),
    ])
      .then(() => console.log("成功获取用户详情、监控列表、候选币种和候选通知开关"))
      .catch((err) => console.error("获取数据失败", err))
      .finally(() => setIsLoading(false));
  }, [router]);

  useEffect(() => {
    if (!priceAlertSymbol && symbols.length > 0) {
      setPriceAlertSymbol(symbols[0].symbol);
    }
  }, [priceAlertSymbol, symbols]);

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
      console.error("获取当前监控列表失败:", error);
      toast.error("获取当前监控列表失败");
      return [];
    }
  };

  const fetchCandidateSymbols = async () => {
    setIsLoadingCandidates(true);

    try {
      const data = await getCandidateSymbols();
      setCandidateSymbols(data);
      return data;
    } catch (error) {
      console.error("获取候选币种失败:", error);
      toast.error("获取候选币种失败，请确认当前账号有 admin 权限");
      return [];
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  const fetchCandidateTopPriceNoticeSetting = async () => {
    setIsLoadingCandidateTopPriceNotice(true);

    try {
      const data = await getCandidateTopPriceNoticeSetting();
      setCandidateTopPriceNoticeEnabled(data.enabled);
      return data;
    } catch (error) {
      console.error("获取候选新高邮件开关失败:", error);
      toast.error("获取候选新高邮件开关失败，请确认当前账号有 admin 权限");
      return { enabled: false };
    } finally {
      setIsLoadingCandidateTopPriceNotice(false);
    }
  };

  const handleAddSymbol = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newSymbol.trim()) {
      toast.error("请输入有效的币种");
      return;
    }

    setIsAddingSymbol(true);

    try {
      // 恢复实际API调用
      await addMarketSymbol(newSymbol.trim());
      toast.success(`已加入监控列表: ${newSymbol}`);
      setNewSymbol("");
      // 重新获取符号列表
      fetchMarketSymbols();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "添加符号失败");
    } finally {
      setIsAddingSymbol(false);
    }
  };

  const handleAddCandidateSymbol = async (symbol: string) => {
    setIsAddingCandidateSymbol((prev) => ({ ...prev, [symbol]: true }));

    try {
      await addMarketSymbol(symbol);
      toast.success(`已加入监控列表: ${symbol}`);
      await fetchMarketSymbols();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加入监控失败");
    } finally {
      setIsAddingCandidateSymbol((prev) => ({ ...prev, [symbol]: false }));
    }
  };

  const handleToggleCandidateTopPriceNotice = async () => {
    const nextEnabled = !candidateTopPriceNoticeEnabled;
    setIsUpdatingCandidateTopPriceNotice(true);

    try {
      const data = await updateCandidateTopPriceNoticeSetting(nextEnabled);
      setCandidateTopPriceNoticeEnabled(data.enabled);
      toast.success(data.enabled ? "已开启候选新高邮件" : "已关闭候选新高邮件");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "更新候选新高邮件开关失败"
      );
    } finally {
      setIsUpdatingCandidateTopPriceNotice(false);
    }
  };

  const handleSavePriceAlert = async (e: React.FormEvent) => {
    e.preventDefault();

    const symbol = priceAlertSymbol.trim();
    const lowPrice = limitLowPrice.trim();
    const highPrice = limitHighPrice.trim();

    if (!symbol) {
      toast.error("请输入币种");
      return;
    }

    if (!lowPrice || !highPrice) {
      toast.error("请输入低价和高价");
      return;
    }

    setIsSavingPriceAlert(true);

    try {
      const data = await setMarketPriceAlert(symbol, lowPrice, highPrice);
      setPriceAlertResponse(data);
      setPriceAlertSymbol(data.symbol || symbol);
      setLimitLowPrice(data.price?.limit_low_price || lowPrice);
      setLimitHighPrice(data.price?.limit_high_price || highPrice);
      toast.success(`已保存价格预警: ${data.symbol || symbol}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存价格预警失败");
    } finally {
      setIsSavingPriceAlert(false);
    }
  };

  const handleDeleteSymbol = async (symbol: string) => {
    setIsDeletingSymbol((prev) => ({ ...prev, [symbol]: true }));

    try {
      // 恢复实际API调用
      const response = await deleteMarketSymbol(symbol);
      // toast.success(`已移出监控列表: ${symbol}`);

      setDialogResponse({
        symbol,
        response,
        // timeStamp: new Date().toISOString(),
      });
      setDialogOpen(true);

      // 更新本地状态，移出监控列表
      setSymbols((prev) => prev.filter((item) => item.symbol !== symbol));
    } catch (error) {
      // toast.error(error instanceof Error ? error.message : "移除监控失败");
      // 显示错误响应弹框
      setDialogResponse({
        symbol,
        error: error instanceof Error ? error.message : "移除监控失败",
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

  const watchedSymbolSet = new Set(
    symbols.map((item) => item.symbol.toLowerCase())
  );
  const normalizedCandidateFilter = candidateFilter.trim().toLowerCase();
  const filteredCandidateSymbols = candidateSymbols.filter((item) => {
    if (!normalizedCandidateFilter) return true;
    return item.symbol.toLowerCase().includes(normalizedCandidateFilter);
  });
  const visibleCandidateSymbols = filteredCandidateSymbols.slice(0, 80);

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
            <CardTitle>手动添加监控币种</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-600">
              只有这里的币种会参与行情拉取、指标计算和策略检查；候选提醒不会自动加入。
            </p>
            <form onSubmit={handleAddSymbol} className="flex gap-2">
              <Input
                placeholder="输入币种，例如: btcusdt"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={isAddingSymbol}>
                {isAddingSymbol ? "加入中..." : "加入"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>价格预警</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSavePriceAlert} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-end">
                <div className="space-y-2">
                  <label htmlFor="price-alert-symbol" className="text-sm font-medium">
                    币种
                  </label>
                  <Input
                    id="price-alert-symbol"
                    placeholder="btcusdt"
                    value={priceAlertSymbol}
                    onChange={(e) => setPriceAlertSymbol(e.target.value.trim())}
                    list="watched-symbols"
                  />
                  <datalist id="watched-symbols">
                    {symbols.map((item) => (
                      <option key={item.symbol} value={item.symbol} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <label htmlFor="limit-low-price" className="text-sm font-medium">
                    低价
                  </label>
                  <Input
                    id="limit-low-price"
                    inputMode="decimal"
                    placeholder="60000"
                    value={limitLowPrice}
                    onChange={(e) => setLimitLowPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="limit-high-price" className="text-sm font-medium">
                    高价
                  </label>
                  <Input
                    id="limit-high-price"
                    inputMode="decimal"
                    placeholder="70000"
                    value={limitHighPrice}
                    onChange={(e) => setLimitHighPrice(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={isSavingPriceAlert}>
                  {isSavingPriceAlert ? "保存中..." : "保存预警"}
                </Button>
              </div>
            </form>

            {priceAlertResponse?.price && (
              <div className="mt-4 grid gap-3 rounded-md border bg-gray-50 p-3 text-sm md:grid-cols-4">
                <div>
                  <p className="text-gray-500">当前价格</p>
                  <p className="font-medium">
                    {safeText(priceAlertResponse.price.current_price || "-")}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">低价预警</p>
                  <p className="font-medium">
                    {safeText(priceAlertResponse.price.limit_low_price || "-")}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">高价预警</p>
                  <p className="font-medium">
                    {safeText(priceAlertResponse.price.limit_high_price || "-")}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">保存时间</p>
                  <p className="font-medium">
                    {safeText(priceAlertResponse.price.set_time || "-")}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>当前监控列表</CardTitle>
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
                            {item.is_valid ? "监控中" : "已暂停"}
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
                              ? "移除中..."
                              : "移除"}
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

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>候选币种</CardTitle>
                <p className="mt-2 text-sm text-gray-600">
                  候选新高邮件默认关闭，开启后才会发送 Binance 候选池突破提醒。
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs ${
                    candidateTopPriceNoticeEnabled
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {candidateTopPriceNoticeEnabled ? "邮件开启" : "邮件关闭"}
                </span>
                <Button
                  variant={candidateTopPriceNoticeEnabled ? "destructive" : "outline"}
                  size="sm"
                  onClick={handleToggleCandidateTopPriceNotice}
                  disabled={
                    isLoadingCandidateTopPriceNotice ||
                    isUpdatingCandidateTopPriceNotice
                  }
                >
                  {isLoadingCandidateTopPriceNotice
                    ? "读取中..."
                    : isUpdatingCandidateTopPriceNotice
                      ? "更新中..."
                      : candidateTopPriceNoticeEnabled
                        ? "关闭新高邮件"
                        : "开启新高邮件"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-600">
              这里来自 Binance 候选池，只用于发现机会；点击加入后才会进入监控列表。
            </p>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Input
                placeholder="搜索候选币种，例如: eth"
                value={candidateFilter}
                onChange={(e) => setCandidateFilter(e.target.value)}
                className="sm:max-w-xs"
              />
              <Button
                variant="outline"
                onClick={fetchCandidateSymbols}
                disabled={isLoadingCandidates}
              >
                {isLoadingCandidates ? "刷新中..." : "刷新候选池"}
              </Button>
            </div>
            {isLoadingCandidates && candidateSymbols.length === 0 ? (
              <div className="text-center py-4 text-gray-500">加载候选币种中...</div>
            ) : visibleCandidateSymbols.length === 0 ? (
              <div className="text-center py-4 text-gray-500">暂无候选币种</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 text-left">币种</th>
                      <th className="px-4 py-2 text-left">候选状态</th>
                      <th className="px-4 py-2 text-left">发现时间</th>
                      <th className="px-4 py-2 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCandidateSymbols.map((item) => {
                      const isWatched = watchedSymbolSet.has(
                        item.symbol.toLowerCase()
                      );
                      const isAdding = isAddingCandidateSymbol[item.symbol];

                      return (
                        <tr key={item.symbol} className="border-t">
                          <td className="px-4 py-2">{item.symbol}</td>
                          <td className="px-4 py-2">
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs ${
                                isWatched
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {isWatched ? "已监控" : "候选"}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {formatTimestamp(item.create_ts)}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <Button
                              variant={isWatched ? "outline" : "default"}
                              size="sm"
                              onClick={() => handleAddCandidateSymbol(item.symbol)}
                              disabled={isWatched || isAdding}
                            >
                              {isWatched
                                ? "已加入"
                                : isAdding
                                  ? "加入中..."
                                  : "加入监控"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {filteredCandidateSymbols.length > visibleCandidateSymbols.length && (
              <p className="mt-3 text-sm text-gray-500">
                已显示前 {visibleCandidateSymbols.length} 个候选币种，可通过搜索缩小范围。
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      {/* 响应弹框 */}
      <ResponseDialog
        title="移除监控响应"
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        response={dialogResponse}
      />
    </div>
  );
}
