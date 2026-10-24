"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getUserInfo,
  getSignalCatalog,
  type SignalCatalog,
  logoutUser,
  isLoggedIn,
  getMarketSymbols,
  getCandidateSymbols,
  getCandidateTopPriceNoticeSetting,
  updateCandidateTopPriceNoticeSetting,
  updateMarketSymbol,
  addMarketSymbol,
  deleteMarketSymbol,
  type UserDetails,
  type SymbolData,
  type MonitorData,
} from "@/lib/api";
import { safeJsonParse, safeText } from "@/lib/security";


const MONITOR_MODEL = "model_daily_ema_hourly_macd";

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
  const [symbols, setSymbols] = useState<MonitorData[]>([]);
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
  const [direction, setDirection] = useState<"" | "buy" | "sell">("buy");
  const [models, setModels] = useState<SignalCatalog["models"]>([]);
  const [modelKey, setModelKey] = useState(MONITOR_MODEL);
  const selectedModel = models.find(model => model.key === modelKey);
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [editing, setEditing] = useState<MonitorData | null>(null);
  const [isAddingSymbol, setIsAddingSymbol] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
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
      getSignalCatalog().then(catalog => setModels(catalog.models.filter(model => model.monitor_directions?.length)))
        .catch(() => toast.error("策略模型加载失败，请刷新后重试")),
      fetchMarketSymbols(),
      fetchCandidateSymbols(),
      fetchCandidateTopPriceNoticeSetting(),
    ])
      .then(() => console.log("成功获取用户详情、监控列表、候选币种和候选通知开关"))
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

  const resetForm = () => {
    setEditing(null);
    setNewSymbol("");
    setDirection("buy");
    setModelKey(MONITOR_MODEL);
    setStopLoss("");
    setTakeProfit("");
  };

  const handleAddSymbol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim() || !direction) {
      toast.error("请填写币种并选择监控方向");
      return;
    }
    if (!selectedModel?.monitor_directions?.includes(direction)) {
      toast.error("请选择支持当前监控方向的已开放模型");
      return;
    }
    setIsAddingSymbol(true);
    const config = {
      monitor_direction: direction,
      strategy_model_key: modelKey,
      stop_loss_price: direction === "sell" ? stopLoss.trim() || null : null,
      take_profit_price: direction === "sell" ? takeProfit.trim() || null : null,
    };
    try {
      if (editing) {
        await updateMarketSymbol(editing.id, config);
      } else {
        await addMarketSymbol(newSymbol, config);
      }
      toast.success(editing ? "监控配置已更新" : "已添加监控");
      resetForm();
      await fetchMarketSymbols();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsAddingSymbol(false);
    }
  };

  const editMonitor = (item: MonitorData) => {
    setEditing(item);
    setNewSymbol(item.symbol);
    setDirection(item.monitor_direction);
    setModelKey(item.strategy_model_key || "");
    setStopLoss(item.stop_loss_price || "");
    setTakeProfit(item.take_profit_price || "");
    document.getElementById("monitor-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAddCandidateSymbol = (symbol: string) => {
    resetForm();
    setNewSymbol(symbol);
    document.getElementById("monitor-form")?.scrollIntoView({ behavior: "smooth" });
    toast.info("已选择买入模型，请确认后添加监控");
  };

  const toggleMonitor = async (item: MonitorData) => {
    setBusyId(item.id);
    try {
      await updateMarketSymbol(item.id, { is_valid: !item.is_valid });
      toast.success(item.is_valid ? "已暂停检查和通知" : "已恢复监控");
      await fetchMarketSymbols();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "更新失败");
    } finally {
      setBusyId(null);
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

  const handleDeleteSymbol = async (item: MonitorData) => {
    setBusyId(item.id);
    try {
      await deleteMarketSymbol(item.id);
      setSymbols((prev) => prev.filter((row) => row.id !== item.id));
      if (editing?.id === item.id) resetForm();
      toast.success("已移除监控，历史数据已保留");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "移除失败");
    } finally {
      setBusyId(null);
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
    symbols.filter((item) => item.user_id === userInfo?.user_id).map((item) => item.symbol.toLowerCase())
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
        <div className="flex flex-wrap gap-3 mb-6">
          <Button onClick={() => router.push("/strategies")}>策略模型</Button>
          <Button
            onClick={() => router.push("/backtest")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            历史模拟记录
          </Button>
        </div>

        <Card className="mb-6" id="monitor-form">
          <CardHeader>
            <CardTitle>{editing ? `编辑监控：${editing.symbol}` : "添加方向监控"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-600">
              选择想关注的方向，满足条件后邮件提醒。通知后继续监控，方向由你手动切换。
            </p>
            {editing && <p className="mb-3 text-sm">所属用户：{editing.user_id} · {editing.is_valid ? "监控中" : "已暂停，保存不会自动恢复"}</p>}
            <form onSubmit={handleAddSymbol} className="space-y-4">
              <fieldset disabled={isAddingSymbol} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span>币种</span>
                    <Input required placeholder="例如 ethusdt" value={newSymbol} disabled={!!editing}
                      onChange={(e) => setNewSymbol(e.target.value)} maxLength={10} />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span>策略模型</span>
                    <select required value={modelKey} className="h-9 w-full rounded-md border bg-white px-3"
                      onChange={(e) => {
                        if (direction && !models.find(model => model.key === e.target.value)?.monitor_directions?.includes(direction)) {
                          toast.error("所选模型不支持当前监控方向，不能切换。请先修改监控方向");
                          return;
                        }
                        setModelKey(e.target.value);
                      }}>
                      {!selectedModel && <option value={modelKey} disabled>原模型未开放，请重新选择</option>}
                      {models.map(model => <option key={model.key} value={model.key}>{model.name}</option>)}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm">
                    <span>监控方向</span>
                    <select required value={direction}
                      onChange={(e) => {
                        if (selectedModel && !selectedModel.monitor_directions?.includes(e.target.value as "buy" | "sell")) {
                          toast.error("所选模型不支持该监控方向，不能切换");
                          return;
                        }
                        if (e.target.value === "buy" && (stopLoss || takeProfit)) {
                          toast.info("保存后将清除止盈止损价");
                        }
                        setDirection(e.target.value as "buy" | "sell");
                      }}
                      className="h-9 w-full rounded-md border bg-white px-3">
                      <option value="" disabled>请选择方向</option>
                      <option value="buy">监控买入机会</option>
                      <option value="sell">监控卖出机会</option>
                    </select>
                  </label>
                </div>
                {direction === "sell" && (
                  <div className="space-y-2">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-2 text-sm">
                        <span>止损价（可选）</span>
                        <Input inputMode="decimal" placeholder="价格跌至此处时提醒" value={stopLoss}
                          onChange={(e) => setStopLoss(e.target.value)} />
                      </label>
                      <label className="space-y-2 text-sm">
                        <span>止盈价（可选）</span>
                        <Input inputMode="decimal" placeholder="价格涨至此处时提醒" value={takeProfit}
                          onChange={(e) => setTakeProfit(e.target.value)} />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">不填价格时仅检查卖出技术信号；填写后，触价也会独立提醒。</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="submit">{isAddingSymbol ? "保存中..." : editing ? "保存修改" : "添加监控"}</Button>
                  {editing && <Button type="button" variant="outline" onClick={resetForm}>取消编辑</Button>}
                </div>
              </fieldset>
            </form>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>当前监控列表</CardTitle>
              <Button variant="outline" size="sm" onClick={() => fetchMarketSymbols()}>刷新</Button>
            </div>
          </CardHeader>
          <CardContent>
            {symbols.length === 0 ? <div className="py-4 text-center text-gray-500">暂无监控，请添加币种并选择方向</div> : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead><tr className="bg-gray-100">
                    <th className="px-3 py-2 text-left">币种 / 用户</th>
                    <th className="px-3 py-2 text-left">方向 / 状态</th>
                    <th className="px-3 py-2 text-left">策略模型</th>
                    <th className="px-3 py-2 text-left">止损 / 止盈</th>
                    <th className="px-3 py-2 text-left">最近提醒</th>
                    <th className="px-3 py-2 text-right">操作</th>
                  </tr></thead>
                  <tbody>{symbols.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-3">{item.symbol}<div className="text-xs text-gray-500">{item.user_id}</div></td>
                      <td className="px-3 py-3">{item.monitor_direction === "buy" ? "买入机会" : "卖出机会"}
                        <div className={item.is_valid ? "text-green-700" : "text-gray-500"}>{!item.strategy_model ? "待重新配置" : item.is_valid ? "监控中" : "已暂停"}</div>
                      </td>
                      <td className="px-3 py-3">{item.strategy_model ? <>
                        <Link className="text-blue-700 hover:underline" href={`/strategies#${encodeURIComponent(item.strategy_model.key)}`}>{item.strategy_model.name}</Link>
                        <div className="text-xs text-gray-500">{item.monitor_direction === "buy" ? "买入规则" : "卖出规则"} · 版本 {item.strategy_model.version}</div>
                      </> : <span className="text-gray-500">模型未启用，请删除或重新配置</span>}</td>
                      <td className="px-3 py-3">{item.stop_loss_price || "—"} / {item.take_profit_price || "—"}</td>
                      <td className="px-3 py-3">{item.last_signal_ts ? formatTimestamp(item.last_signal_ts) : "暂无"}
                        <div className="text-xs text-gray-500">{{ model_daily_ema_hourly_macd: "日线 EMA / 小时 MACD", model_top_rise: "技术信号", take_profit: "触及止盈", stop_loss: "触及止损" }[item.last_signal_reason] || ""}</div>
                      </td>
                      <td className="px-3 py-3"><div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" disabled={busyId !== null || isAddingSymbol} onClick={() => editMonitor(item)}>编辑</Button>
                        <Button size="sm" variant="outline" disabled={busyId !== null || isAddingSymbol} onClick={() => toggleMonitor(item)}>{item.is_valid ? "暂停" : "恢复"}</Button>
                        <Button size="sm" variant="destructive" disabled={busyId !== null || isAddingSymbol} onClick={() => handleDeleteSymbol(item)}>移除</Button>
                      </div></td>
                    </tr>
                  ))}</tbody>
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
                              disabled={isWatched || isAddingSymbol}
                            >
                              {isWatched
                                ? "已加入"
                                : "选择方向"}
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
    </div>
  );
}
