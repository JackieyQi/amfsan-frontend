"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSignalCatalog, isLoggedIn, type SignalCatalog, type StrategyRule } from "@/lib/api";
import { CustomStrategies } from "@/components/custom-strategies";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const factorNames: Record<string, string> = {
  kline_1d_factors: "日线 · K 线 / EMA / 布林带",
  kline_4h_factors: "4h · K 线 / EMA / 布林带",
  kline_1h_factors: "1h · K 线 / EMA / 布林带",
  macd_4h_factors: "4h · MACD",
  kdj_4h_factors: "4h · KDJ",
  rsi_4h_factors: "4h · RSI",
};

function RuleView({ rule, catalog }: { rule: StrategyRule; catalog: SignalCatalog }) {
  if (typeof rule === "string") {
    const condition = catalog.conditions[rule];
    if (!condition) return <p className="text-red-700">条件定义缺失：{rule}</p>;
    return (
      <details className="rounded-lg border bg-white p-3">
        <summary className="cursor-pointer font-medium">
          {condition.name}
          {condition.review_note && <span className="ml-2 text-xs text-amber-700">有待确认项</span>}
        </summary>
        <div className="mt-3 space-y-2 text-sm text-gray-600">
          <p>{condition.description || condition.name}</p>
          <p>指标来源：{factorNames[condition.factor] || condition.factor}</p>
          <p>K 线范围：{condition.candle_scope}</p>
          {condition.review_note && <p className="rounded bg-amber-50 p-2 text-amber-900">待确认：{condition.review_note}</p>}
          <details>
            <summary className="cursor-pointer">参数与实现位置</summary>
            <dl className="mt-2 space-y-1 break-words">
              <dt>条件标识：{rule}</dt>
              <dd>方法／字段：{condition.method || condition.field}</dd>
              <dd>参数：{Object.entries(condition.params).map(([key, value]) => `${key} = ${value}`).join("；") || "无"}</dd>
              {condition.indices && <dd>检查索引：{condition.indices.join("、")}；至少满足 {condition.minimum} 项{condition.negate ? "，再对结果取反" : ""}</dd>}
              {condition.comparison && <dd>比较：{condition.comparison === "lt" ? "小于" : "大于"} {condition.value}</dd>}
            </dl>
          </details>
        </div>
      </details>
    );
  }
  const label = rule.op === "all" ? "全部满足（AND）" : rule.op === "any" ? "任意满足（OR）" : `至少满足 ${rule.minimum} 项`;
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
      <p className="mb-3 text-sm font-semibold text-blue-900">{label}</p>
      <div className="space-y-3">
        {rule.children.map((child, index) => <RuleView key={index} rule={child} catalog={catalog} />)}
      </div>
    </div>
  );
}

export default function StrategiesPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<SignalCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getSignalCatalog();
      if (!result.models || !result.conditions) throw new Error("策略定义接口尚未更新，请先部署配套后端。");
      setCatalog(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取策略定义失败");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!isLoggedIn()) { router.push("/"); return; }
    void refresh();
  }, [router, refresh]);

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-2xl font-bold">策略模型</h1><p className="mt-2 text-sm text-gray-600">指标与因子 → 信号条件 → 入场／离场规则</p></div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push("/backtest")}>历史模拟记录</Button>
            <Button variant="outline" onClick={() => router.push("/home")}>返回首页</Button>
            <Button onClick={refresh} disabled={loading}>{loading ? "加载中…" : "刷新定义"}</Button>
          </div>
        </div>
        {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}
        {catalog && <CustomStrategies />}
        {catalog && <>
          <Card><CardHeader><CardTitle>当前运行方式</CardTitle></CardHeader><CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm text-gray-600">{catalog.notes.map(note => <li key={note}>{note}</li>)}</ul>
            <p className="mt-3 text-sm text-gray-600">内置模型只读，自定义模型可以新增和编辑；索引 0 表示当前可能尚未收盘的 K 线。</p>
          </CardContent></Card>
          <h2 className="text-xl font-semibold">内置策略模型</h2>
          {catalog.models.map(model => <Card key={model.key}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3"><CardTitle>{model.name}</CardTitle><span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">{model.status}</span></div>
              <p className="text-sm text-gray-600">{model.summary}</p>
              <p className="text-xs text-gray-500">{model.key} · 规则版本 {model.version}</p>
            </CardHeader>
            <CardContent className="grid items-start gap-6 lg:grid-cols-2">
              <section><h2 className="mb-3 font-semibold">买入方向 · 入场规则</h2>{model.entry ? <RuleView rule={model.entry} catalog={catalog} /> : <p className="text-sm text-gray-500">尚未迁移为条件组合，请参考原有实现。</p>}</section>
              <section><h2 className="mb-3 font-semibold">卖出方向 · 离场规则</h2>{model.exit ? <RuleView rule={model.exit} catalog={catalog} /> : <p className="text-sm text-gray-500">尚未迁移为条件组合，请参考原有实现。</p>}</section>
            </CardContent>
          </Card>)}
        </>}
      </div>
    </main>
  );
}
