"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCustomStrategies, saveCustomStrategy, type CustomStrategy, type CustomDefinition, type CustomRule, type CustomCondition, type SignalCatalog } from "@/lib/api";

const selectClass = "rounded border bg-white p-2 text-sm";

export function CustomStrategies({ catalog }: { catalog: SignalCatalog }) {
  const options = Object.entries(catalog.conditions);
  const newCondition = (): CustomCondition => options[0]?.[0] || "";
  const newRule = (): CustomRule => ({ op: "all", conditions: [newCondition()] });
  const describe = (c: CustomCondition) => typeof c === "string"
    ? catalog.conditions[c]?.name || `条件已不可用：${c}`
    : `${c.interval} MACD 柱值 · ${c.relation === "above_zero" ? "> 0" : "< 0"} · ${c.candle === "closed" ? "最近已收盘" : "当前未收盘"}（旧配置）`;
  const [items, setItems] = useState<CustomStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [draft, setDraft] = useState<CustomDefinition | null>(null);
  const [original, setOriginal] = useState<CustomStrategy>();
  const [saving, setSaving] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try { setItems((await getCustomStrategies()).strategies); }
    catch (e) { setError(e instanceof Error ? e.message : "读取模型失败"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const edit = (item?: CustomStrategy) => {
    setOriginal(item); setSaved(""); setError("");
    setDraft(item ? JSON.parse(JSON.stringify(item.definition)) : { name: "", buy: newRule(), sell: null });
  };
  const changeRule = (direction: "buy" | "sell", rule: CustomRule | null) => {
    setDraft(current => current ? { ...current, [direction]: rule } : null);
  };
  const save = async () => {
    if (!draft || !draft.name.trim() || (!draft.buy && !draft.sell)) {
      setError("请填写名称并至少配置一个信号方向"); return;
    }
    setSaving(true); setError("");
    try {
      const result = await saveCustomStrategy(draft, original);
      setItems(previous => [result, ...previous.filter(item => item.id !== result.id)]);
      setDraft(null); setOriginal(undefined); setSaved("模型已保存，尚未绑定监控。");
    } catch (e) { setError(e instanceof Error ? e.message : "保存失败，配置仍保留在编辑框中"); }
    finally { setSaving(false); }
  };
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-semibold">我的策略模型</h2><p className="text-sm text-gray-600">从系统条件库选择条件并组合。仅自己可见和编辑，保存不会启用或替换当前监控策略。</p></div>
      <div className="flex gap-2"><Button disabled={saving || !!draft} onClick={() => edit()}>新增模型</Button></div>
    </div>
    {error && <div role="alert" className="space-y-2 rounded bg-red-50 p-3 text-red-700">
      <p>{error}</p>
      <Button variant="outline" disabled={loading || saving} onClick={() => {
        setDraft(null); setOriginal(undefined); setSaved(""); void refresh();
      }}>{draft ? "放弃本次编辑并重新加载" : "重试"}</Button>
    </div>}
    {saved && <p role="status" className="text-green-700">{saved}</p>}
    {draft && <Card><CardHeader><CardTitle>{original ? "编辑模型" : "新增模型"}</CardTitle></CardHeader><CardContent>
      <fieldset disabled={saving} className="space-y-4">
        <label className="block">模型名称<Input className="mt-2" maxLength={64} value={draft.name} placeholder="例如 testA" onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
        {(["buy", "sell"] as const).map(direction => {
          const rule = draft[direction];
          return <div key={direction} className="space-y-3 rounded border p-3">
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!rule} onChange={e => changeRule(direction, e.target.checked ? newRule() : null)} />{direction === "buy" ? "买入规则" : "卖出规则"}</label>
            {rule ? <>
              <label className="flex items-center gap-2">组合方式<select className={selectClass} value={rule.op} onChange={e => changeRule(direction, { ...rule, op: e.target.value as CustomRule["op"] })}><option value="all">全部满足（AND）</option><option value="any">任意满足（OR）</option></select></label>
              {rule.conditions.map((condition, index) => {
                const selected = typeof condition === "string" ? catalog.conditions[condition] : null;
                return <div key={index} className="space-y-2 rounded bg-gray-50 p-3">
                  <label className="flex flex-wrap items-center gap-2"><span className="text-sm">条件 {index + 1}</span>
                  <select aria-label={`条件 ${index + 1}`} className={selectClass} value={typeof condition === "string" ? condition : "__legacy__"} onChange={e => changeRule(direction, { ...rule, conditions: rule.conditions.map((c, i) => i === index ? e.target.value : c) })}>
                    {typeof condition !== "string" && <option value="__legacy__">{describe(condition)}</option>}
                    {typeof condition === "string" && !selected && <option value={condition}>{describe(condition)}</option>}
                    {options.map(([key, value]) => <option key={key} value={key}>{value.name}</option>)}
                  </select></label>
                  {selected && <p className="text-sm text-gray-600">{selected.description || selected.structure?.operation} · {selected.candle_scope}</p>}
                  {selected?.review_note && <p className="text-sm text-amber-800">待确认：{selected.review_note}</p>}
                  <Button variant="outline" size="sm" disabled={rule.conditions.length === 1} onClick={() => changeRule(direction, { ...rule, conditions: rule.conditions.filter((_, i) => i !== index) })}>移除条件</Button>
                </div>;
              })}
              <Button variant="outline" disabled={rule.conditions.length >= 20} onClick={() => changeRule(direction, { ...rule, conditions: [...rule.conditions, newCondition()] })}>添加条件</Button>
            </> : <p className="text-sm text-gray-500">未定义此方向，不产生对应信号。</p>}
          </div>;
        })}
        <p className="text-sm text-gray-600">所选条件使用系统定义的参数和取样范围；当前未收盘 K 线的判断可能随行情变化。旧配置保留原含义，可逐项替换为条件库条件。</p>
        <div className="flex gap-2"><Button onClick={save}>{saving ? "保存中…" : "保存模型"}</Button><Button variant="outline" onClick={() => { setDraft(null); setError(""); }}>取消</Button></div>
      </fieldset>
    </CardContent></Card>}
    {loading ? <p>加载我的模型…</p> : !error && items.length === 0 ? <p className="text-gray-500">还没有自定义模型，可以新增 testA 开始配置。</p> : null}
    {items.map(item => <Card key={item.id}><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>{item.definition.name}</CardTitle><Button variant="outline" disabled={saving || !!draft} onClick={() => edit(item)}>编辑</Button></div><p className="text-sm text-gray-500">自定义 · 未启用 · 版本 {item.version}</p></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
      {(["buy", "sell"] as const).map(direction => {
        const rule = item.definition[direction];
        return <section key={direction}><h3 className="font-medium">{direction === "buy" ? "买入" : "卖出"}规则</h3>{rule ? <><p className="my-2 text-sm text-blue-800">{rule.op === "all" ? "全部满足（AND）" : "任意满足（OR）"}</p><ul className="space-y-2">{rule.conditions.map((c, i) => <li key={i} className="rounded border p-2 text-sm">{describe(c)}</li>)}</ul></> : <p className="mt-2 text-sm text-gray-500">未定义</p>}</section>;
      })}
    </CardContent></Card>)}
  </section>;
}
