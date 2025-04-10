import { safeJsonParse } from "./security";

// 获取存储的token
export function getAuthToken(): string | null {
  const userInfoStr = localStorage.getItem("userInfo");
  if (!userInfoStr) return null;

  try {
    // 使用安全的JSON解析
    const userInfo = safeJsonParse<{ token: string }>(userInfoStr, {
      token: "",
    });
    return userInfo.token;
  } catch (error) {
    return null;
  }
}
