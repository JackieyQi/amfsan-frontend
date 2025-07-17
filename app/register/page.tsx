"use client";

import type React from "react";
import { useState } from "react";
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
import { registerUser, getEmailVerificationCode } from "@/lib/api";
import { isValidEmail, isStrongPassword } from "@/lib/security";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingCode, setIsGettingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const router = useRouter();

  const handleGetVerificationCode = async () => {
    // 输入验证
    if (!email) {
      toast.error("请输入邮箱");
      return;
    }

    // 验证邮箱格式
    if (!isValidEmail(email)) {
      toast.error("请输入有效的邮箱地址");
      return;
    }

    setIsGettingCode(true);

    try {
      await getEmailVerificationCode(email);
      toast.success("验证码已发送到您的邮箱");

      // 开始倒计时
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "获取验证码失败");
    } finally {
      setIsGettingCode(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // 输入验证
    if (!email || !password || !confirmPassword || !verificationCode) {
      toast.error("请填写所有必填字段");
      return;
    }

    // 验证邮箱格式
    if (!isValidEmail(email)) {
      toast.error("请输入有效的邮箱地址");
      return;
    }

    // 验证密码强度
    if (!isStrongPassword(password)) {
      toast.error("密码长度至少为8个字符");
      return;
    }

    // 验证密码一致性
    if (password !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    // 验证码格式验证
    if (!/^\d{6}$/.test(verificationCode)) {
      toast.error("验证码应为6位数字");
      return;
    }

    setIsLoading(true);

    try {
      // 更新为新的API参数格式
      await registerUser(email, password, verificationCode, inviteCode);
      toast.success("注册成功，请登录");
      router.push("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "注册失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">注册</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                邮箱
              </label>
              <div className="flex space-x-2">
                <Input
                  id="email"
                  type="email" // 使用email类型增加浏览器验证
                  placeholder="请输入邮箱"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())} // 去除空格
                  required
                  className="flex-1"
                  autoComplete="email" // 增加自动完成属性
                />
                <Button
                  type="button"
                  onClick={handleGetVerificationCode}
                  disabled={isGettingCode || countdown > 0}
                  className="whitespace-nowrap"
                >
                  {countdown > 0 ? `${countdown}秒后重试` : "获取验证码"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="verificationCode" className="text-sm font-medium">
                验证码
              </label>
              <Input
                id="verificationCode"
                type="text"
                placeholder="请输入验证码"
                value={verificationCode}
                onChange={(e) =>
                  setVerificationCode(e.target.value.replace(/\D/g, ""))
                } // 只允许数字
                required
                maxLength={6} // 限制长度
                pattern="\d{6}" // 验证格式
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
                minLength={8} // 最小长度
                autoComplete="new-password" // 增加自动完成属性
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                确认密码
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8} // 最小长度
                autoComplete="new-password" // 增加自动完成属性
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="inviteCode" className="text-sm font-medium">
                邀请码
              </label>
              <Input
                id="inviteCode"
                type="text"
                placeholder="请输入邀请码"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.trim())} // 去除空格
                required
                maxLength={6} // 限制长度
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "注册中..." : "注册"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            已有账号？点击登录
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
