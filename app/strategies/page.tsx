"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSignalCatalog, isLoggedIn, type SignalCatalog, type SignalFactor, type StrategyRule } from "@/lib/api";
import { ModelDetails } from "@/components/model-details";
import { CustomStrategies } from "@/components/custom-strategies";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ruleIndicators(rule: StrategyRule | null, catalog: SignalCatalog): string[] {
  if (!rule) return [];
  if (typeof rule !== "string") return [...new Set(rule.children.flatMap(child => ruleIndicators(child, catalog)))];
  const condition = catalog.conditions[rule];
  if (!condition) return [];
  return condition.structure?.factors || [];
}

function IndicatorTags({ names, factors }: { names: string[]; factors: SignalFactor[] }) {
  return <div className="flex flex-wrap gap-2">{factors.filter(indicator => names.includes(indicator.name)).map(({ name }) => <span key={name} className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-800">{name}</span>)}</div>;
}

function RuleView({ rule, catalog }: { rule: StrategyRule; catalog: SignalCatalog }) {
  if (typeof rule === "string") {
    const condition = catalog.conditions[rule];
    if (!condition) return <p className="text-red-700">条件定义缺失：{rule}</p>;
    return (
      <details className="rounded-lg border bg-white p-3">
        <summary className="cursor-pointer rounded font-medium focus-visible:outline-2 focus-visible:outline-blue-600">
          <span>{condition.name}</span>
          <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">{catalog.factors.filter(indicator => ruleIndicators(rule, catalog).includes(indicator.name)).map(({ name }) => <span key={name} className="rounded bg-blue-50 px-2 py-1 text-xs font-normal text-blue-800">{name}</span>)}</span>
          {condition.structure && <span className="ml-2 text-xs font-normal text-gray-500">{condition.negate ? "均不触发过热" : condition.structure.requirement === "全部满足" ? `${condition.structure.sampling.count} 个取样全部满足` : condition.structure.requirement}</span>}
          {(condition.review_note || !condition.structure) && <span className="ml-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">待确认</span>}
        </summary>
        <div className="mt-3 space-y-3 border-t pt-3">
        {!condition.structure && <p className="text-sm text-amber-900">待确认：此条件尚无结构化定义，请更新后端或核对原始规则。</p>}
        {condition.structure && <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-gray-500">周期</dt><dd>{condition.structure.interval}</dd>
          <dt className="text-gray-500">判断方式</dt><dd>{condition.structure.operation}</dd>
          <dt className="text-gray-500">取样数量</dt><dd>{condition.structure.sampling.count} 个取样位置{condition.structure.change_count !== null ? ` · ${condition.structure.change_count} 次变化` : ""}</dd>
          <dt className="text-gray-500">取样范围</dt><dd>{condition.structure.sampling.scope}</dd>
          <dt className="text-gray-500">当前 K 线</dt><dd>{condition.structure.sampling.includes_current ? "包含，可能尚未收盘" : "不包含，仅已收盘"}</dd>
          <dt className="text-gray-500">满足要求</dt><dd>{condition.structure.requirement}</dd>
          {condition.structure.indicator_parameters.length > 0 && <><dt className="text-gray-500">指标参数</dt><dd>{condition.structure.indicator_parameters.map(p => `${p.label}：${p.value}${p.unit ? `（${p.unit}）` : ""}`).join("；")}</dd></>}
          {condition.structure.parameters.length > 0 && <><dt className="text-gray-500">判断参数</dt><dd>{condition.structure.parameters.map(p => `${p.label}：${p.value}${p.unit ? `（${p.unit}）` : ""}`).join("；")}</dd></>}
        </dl>}
        {condition.review_note && <p className="rounded bg-amber-50 p-2 text-sm text-amber-900">待确认：{condition.review_note}</p>}
        <div className="mt-3 space-y-2 text-sm text-gray-600">
          <p>{condition.description || condition.name}</p>
          {!condition.structure && <p>K 线范围：{condition.candle_scope}</p>}
          <details>
            <summary className="cursor-pointer">参数与实现位置</summary>
            <dl className="mt-2 space-y-1 break-words">
              <dt>条件标识：{rule}</dt>
              <dd>数据来源：{condition.factor}</dd>
              <dd>方法／字段：{condition.method || condition.field}</dd>
              <dd>参数：{Object.entries(condition.params).map(([key, value]) => `${key} = ${value}`).join("；") || "无"}</dd>
              {condition.indices && <dd>检查索引：{condition.indices.join("、")}；至少满足 {condition.minimum} 项{condition.negate ? "，再对结果取反" : ""}</dd>}
              {condition.comparison && <dd>比较：{condition.comparison === "lt" ? "小于" : "大于"} {condition.value}</dd>}
            </dl>
          </details>
        </div>
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
  const [preview, setPreview] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getSignalCatalog();
      if (!result.models || !result.conditions || !Array.isArray(result.factors)) throw new Error("策略定义接口尚未更新，请先部署配套后端。");
      setCatalog(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取策略定义失败");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).get("preview") === "1") {
      setPreview(true);
      void import("@/lib/strategy-preview.json").then(data => {
        setCatalog(data.default as SignalCatalog);
        setLoading(false);
      }).catch(() => { setError("预览数据加载失败，请刷新页面重试。"); setLoading(false); });
      return;
    }
    if (!isLoggedIn()) { router.push("/"); return; }
    void refresh();
  }, [router, refresh]);

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-2xl font-bold">策略模型</h1><p className="mt-2 text-sm text-gray-600">指标与因子 → 信号条件 → 入场／离场规则</p></div>
          {!preview && <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push("/backtest")}>历史模拟记录</Button>
            <Button variant="outline" onClick={() => router.push("/home")}>返回首页</Button>
          </div>}
        </div>
        {preview && <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">本地只读预览 · 使用内置规则快照，不读取账户数据；自定义模型编辑需登录后使用。</p>}
        {loading && <p className="text-gray-600">加载策略定义中…</p>}
        {error && <div role="alert" className="space-y-2 rounded border border-red-200 bg-red-50 p-4 text-red-700">
          <p>{error}</p>
          <Button variant="outline" onClick={refresh} disabled={loading}>重试</Button>
        </div>}
        {catalog && <Card>
          <CardHeader><CardTitle>基础因子</CardTitle><p className="text-sm text-gray-600">系统提供固定的指标与价格因子，判断条件再组合成策略的买入、卖出规则。</p></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{catalog.factors.map(indicator => <div key={indicator.key} className="space-y-2 rounded-lg border p-3">
              <h3 className="font-semibold">{indicator.name}</h3>
              <p className="text-sm text-gray-600">{indicator.description}</p>
            </div>)}</div>
            <p className="mt-4 text-sm text-gray-600">下方每条条件标注关联因子；直接比较价格与指标的条件会同时标注 K 线和对应指标。</p>
          </CardContent>
        </Card>}
        {catalog && !preview && <CustomStrategies catalog={catalog} />}
        {catalog && <>
          <Card><CardHeader><CardTitle>当前运行方式</CardTitle></CardHeader><CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm text-gray-600">{catalog.notes.map(note => <li key={note}>{note}</li>)}</ul>
            <p className="mt-3 text-sm text-gray-600">内置模型只读，自定义模型可以新增和编辑；索引 0 表示当前可能尚未收盘的 K 线。</p>
          </CardContent></Card>
          <h2 className="text-xl font-semibold">内置策略模型</h2>
          {catalog.models.map(model => <Card key={model.key} id={model.key} className="scroll-mt-4">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3"><CardTitle>{model.name}</CardTitle><span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">{model.status}</span></div>
              <p className="text-sm text-gray-600">{model.summary}</p>
            </CardHeader>
            <CardContent>
              <ModelDetails name={model.name}>
              {model.entry || model.exit ? <div className="space-y-2"><p className="text-xs text-gray-500">使用因子</p><IndicatorTags factors={catalog.factors} names={[...new Set([...ruleIndicators(model.entry, catalog), ...ruleIndicators(model.exit, catalog)])]} /></div> : <p className="text-xs text-gray-500">使用因子：待整理</p>}
              <p className="text-xs text-gray-500">{model.key} · 规则版本 {model.version}</p>
              <div className="grid items-start gap-6 lg:grid-cols-2">
              <section><h2 className="mb-3 font-semibold">买入方向 · 入场规则</h2>{model.entry ? <RuleView rule={model.entry} catalog={catalog} /> : <p className="text-sm text-gray-500">尚未迁移为条件组合，请参考原有实现。</p>}</section>
              <section><h2 className="mb-3 font-semibold">卖出方向 · 离场规则</h2>{model.exit ? <RuleView rule={model.exit} catalog={catalog} /> : <p className="text-sm text-gray-500">未定义卖出规则。</p>}</section>
              </div>
              </ModelDetails>
            </CardContent>
          </Card>)}
        </>}
      </div>
    </main>
  );
}
