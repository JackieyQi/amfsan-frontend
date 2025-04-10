"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loginUser, isLoggedIn } from "@/lib/api";
import { isValidEmail } from "@/lib/security";
import config from "@/lib/config";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const router = useRouter();

  // 检查是否已登录
  useEffect(() => {
    if (isLoggedIn()) {
      // 已经登录，重定向到首页
      router.push("/home");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // 重置错误状态
    setApiError(null);

    // 输入验证
    if (!email || !password) {
      toast.error("请填写所有必填字段");
      return;
    }

    // 验证邮箱格式
    if (!isValidEmail(email)) {
      toast.error("请输入有效的邮箱地址");
      return;
    }

    setIsLoading(true);

    try {
      // 恢复实际API调用
      await loginUser(email, password);
      toast.success("登录成功");

      // 确保在重定向前等待一小段时间，让toast显示完成
      setTimeout(() => {
        // 强制刷新页面并重定向，确保状态被正确更新
        window.location.href = "/home";
      }, 500);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "登录失败，请检查API配置";
      toast.error(errorMessage);
      setApiError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">JUST HODL IT</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                邮箱
              </label>
              <Input
                id="email"
                type="email" // 使用email类型增加浏览器验证
                placeholder="请输入邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())} // 去除空格
                required
                autoComplete="email" // 增加自动完成属性
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                密码
              </label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password" // 增加自动完成属性
              />
            </div>
            {apiError && (
              <div className="p-3 text-sm bg-red-50 border border-red-200 rounded-md text-red-600">
                {apiError}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "登录中..." : "登录"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link
            href="/register"
            className="text-sm text-blue-600 hover:underline"
          >
            没有账号？点击注册
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
