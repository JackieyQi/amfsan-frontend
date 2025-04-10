"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { X } from "lucide-react";
import { getBacktestDetail, formatTimestamp } from "@/lib/backtest-api";

interface BacktestDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  recordId?: string;
}

export function BacktestDetailDialog({
  isOpen,
  onClose,
  symbol,
  recordId,
}: BacktestDetailDialogProps) {
  const [detail, setDetail] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && symbol) {
      fetchDetail();
    }
  }, [isOpen, symbol, recordId]);

  const fetchDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getBacktestDetail(symbol, recordId);
      setDetail(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "获取详情失败");
      console.error("获取详情失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>回测详情 - {symbol.toUpperCase()}</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="overflow-auto flex-grow">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2">加载中...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
              <p>{error}</p>
            </div>
          ) : detail ? (
            <div className="space-y-6">
              {/* 基本信息 */}
              <div>
                <h3 className="text-lg font-medium mb-2">基本信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md">
                  <div>
                    <p className="text-sm text-gray-500">交易对</p>
                    <p className="font-medium">
                      {detail.symbol?.toUpperCase() || symbol.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">状态</p>
                    <p className="font-medium">{detail.status_text || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">盈亏比例</p>
                    <p
                      className={`font-medium ${
                        detail.profit_percent?.startsWith("-")
                          ? "text-red-500"
                          : detail.profit_percent &&
                            detail.profit_percent !== "0.0%"
                          ? "text-green-500"
                          : ""
                      }`}
                    >
                      {detail.profit_percent || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">持有时间</p>
                    <p className="font-medium">
                      {detail.hold_time ? `${detail.hold_time}秒` : "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 买入信息 */}
              <div>
                <h3 className="text-lg font-medium mb-2">买入信息</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">买入价格</p>
                      <p className="font-medium">{detail.buy_price || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">买入时间</p>
                      <p className="font-medium">
                        {formatTimestamp(detail.buy_ts)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">买入信号价格</p>
                      <p className="font-medium">{detail.bid_price || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">买入信号时间</p>
                      <p className="font-medium">
                        {formatTimestamp(detail.bid_ts)}
                      </p>
                    </div>
                  </div>
                  {detail.bid_plot_msg && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">买入信号详情</p>
                      <div
                        className="bg-white p-3 rounded border text-sm overflow-auto max-h-60"
                        dangerouslySetInnerHTML={{
                          __html: detail.bid_plot_msg,
                        }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>

              {/* 卖出信息 */}
              {(detail.sell_price || detail.ask_price) && (
                <div>
                  <h3 className="text-lg font-medium mb-2">卖出信息</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">卖出价格</p>
                        <p className="font-medium">
                          {detail.sell_price || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">卖出时间</p>
                        <p className="font-medium">
                          {formatTimestamp(detail.sell_ts)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">卖出信号价格</p>
                        <p className="font-medium">{detail.ask_price || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">卖出信号时间</p>
                        <p className="font-medium">
                          {formatTimestamp(detail.ask_ts)}
                        </p>
                      </div>
                    </div>
                    {detail.ask_plot_msg && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">
                          卖出信号详情
                        </p>
                        <div
                          className="bg-white p-3 rounded border text-sm overflow-auto max-h-60"
                          dangerouslySetInnerHTML={{
                            __html: detail.ask_plot_msg,
                          }}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 其他详细信息 */}
              {detail.extra_info && (
                <div>
                  <h3 className="text-lg font-medium mb-2">其他信息</h3>
                  <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-auto whitespace-pre-wrap">
                    {typeof detail.extra_info === "string"
                      ? detail.extra_info
                      : JSON.stringify(detail.extra_info, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">暂无详情数据</div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end border-t p-4">
          <Button onClick={onClose}>关闭</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
