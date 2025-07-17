"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isLoggedIn } from "@/lib/api";
import {
  getBacktestRecords,
  formatTimestamp,
  getStatusText,
  type BacktestRecord,
  type PaginationInfo,
  type BacktestDetailRecord,
} from "@/lib/backtest-api";
import { BacktestDetailDialog } from "@/components/backtest-detail-dialog";

export default function BacktestPage() {
  const [records, setRecords] = useState<BacktestRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    current_page: 1,
    page_size: 10,
    total_count: 0,
    total_pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [symbol, setSymbol] = useState("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<string | undefined>(
    undefined
  );
  const router = useRouter();

  useEffect(() => {
    // 检查用户是否已登录
    if (!isLoggedIn()) {
      toast.error("请先登录");
      router.push("/");
      return;
    }

    fetchBacktestRecords();
  }, [page, router]);

  const fetchBacktestRecords = async () => {
    setIsLoading(true);
    try {
      const statusValue = status ? Number.parseInt(status) : undefined;
      const response = await getBacktestRecords(
        page,
        pagination.page_size,
        symbol || undefined,
        statusValue
      );
      setRecords(response.records || []);
      setPagination(
        response.pagination || {
          current_page: page,
          page_size: 10,
          total_count: 0,
          total_pages: 0,
        }
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "获取回测记录失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1); // 重置到第一页
    fetchBacktestRecords();
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.total_pages) return;
    setPage(newPage);
  };

  const handleViewDetail = (record: BacktestRecord) => {
    setSelectedSymbol(record.symbol);
    setSelectedRecordId(record.id);
    setDetailDialogOpen(true);
  };

  const renderPagination = () => {
    const { current_page, total_pages } = pagination;

    // 计算要显示的页码范围
    let startPage = Math.max(1, current_page - 2);
    const endPage = Math.min(total_pages, startPage + 4);

    // 调整起始页，确保显示5个页码（如果有足够的页数）
    if (endPage - startPage < 4 && total_pages > 4) {
      startPage = Math.max(1, endPage - 4);
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-500">
          共 {pagination.total_count} 条记录，第 {current_page}/{total_pages} 页
        </div>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={current_page === 1}
          >
            首页
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(current_page - 1)}
            disabled={current_page === 1}
          >
            上一页
          </Button>

          {pages.map((p) => (
            <Button
              key={p}
              variant={p === current_page ? "default" : "outline"}
              size="sm"
              onClick={() => handlePageChange(p)}
            >
              {p}
            </Button>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(current_page + 1)}
            disabled={current_page === total_pages}
          >
            下一页
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(total_pages)}
            disabled={current_page === total_pages}
          >
            末页
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">策略实盘数据</h1>
          <Button variant="outline" onClick={() => router.push("/home")}>
            返回首页
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>筛选条件</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="w-full md:w-auto flex-1">
                <label className="text-sm font-medium mb-1 block">交易对</label>
                <Input
                  placeholder="输入交易对，例如: btcusdt"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toLowerCase())}
                />
              </div>
              <div className="w-full md:w-auto flex-1">
                <label className="text-sm font-medium mb-1 block">状态</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* <SelectItem value="1">全部</SelectItem> */}
                    <SelectItem value="0">挂买单中</SelectItem>
                    <SelectItem value="1">买入成功，等待卖出</SelectItem>
                    <SelectItem value="2">买入失败</SelectItem>
                    <SelectItem value="3">挂卖单中</SelectItem>
                    <SelectItem value="4">卖出成功</SelectItem>
                    <SelectItem value="5">挂卖单失败，以市价卖出</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-auto flex items-end">
                <Button onClick={handleSearch} disabled={isLoading}>
                  {isLoading ? "搜索中..." : "搜索"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>实盘记录</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">加载中...</div>
            ) : records.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无数据</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-2 text-left">交易对</th>
                      <th className="px-3 py-2 text-left">买入价格</th>
                      <th className="px-3 py-2 text-left">买入时间</th>
                      <th className="px-3 py-2 text-left">卖出价格</th>
                      {/* <th className="px-3 py-2 text-left">卖出时间</th> */}
                      <th className="px-3 py-2 text-left">持有时间</th>
                      <th className="px-3 py-2 text-left">盈亏比例</th>
                      <th className="px-3 py-2 text-left">状态</th>
                      <th className="px-3 py-2 text-left">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record, index) => (
                      <tr key={index} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">
                          {record.symbol}
                        </td>
                        <td className="px-3 py-2">{record.buy_price || "-"}</td>
                        <td className="px-3 py-2">
                          {formatTimestamp(record.buy_ts)}
                        </td>
                        <td className="px-3 py-2">
                          {record.sell_price || "-"}
                        </td>
                        {/* <td className="px-3 py-2">
                          {formatTimestamp(record.sell_ts)}
                        </td> */}
                        <td className="px-3 py-2">
                          {record.hold_time ? `${record.hold_time}` : "-"}
                        </td>
                        <td
                          className={`px-3 py-2 ${
                            record.profit_percent.startsWith("-")
                              ? "text-red-500"
                              : record.profit_percent !== "0.0%"
                              ? "text-green-500"
                              : ""
                          }`}
                        >
                          {record.profit_percent || "-"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs ${
                              record.status === 0
                                ? "bg-blue-100 text-blue-800"
                                : record.status === 1
                                ? "bg-green-100 text-green-800"
                                : record.status === 2
                                ? "bg-gray-100 text-gray-800"
                                : record.status === 3
                                ? "bg-red-100 text-red-800"
                                : record.status === 4
                                ? "bg-red-200 text-red-800"
                                : "bg-red-400 text-red-900"
                            }`}
                          >
                            {record.status_text || getStatusText(record.status)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetail(record)}
                          >
                            详情
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {renderPagination()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 详情弹框 */}
      <BacktestDetailDialog
        isOpen={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        symbol={selectedSymbol}
        recordId={selectedRecordId}
      />
    </div>
  );
}
