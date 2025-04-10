// 导入配置和安全工具
import config from "./config";
import { safeJsonParse } from "./security";
import { getAuthToken } from "./api-utils";

// 定义API响应类型
interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

// 登录响应数据类型
interface LoginResponseData {
  user_id: string;
  token: string;
  expires_at: number;
}

// 用户信息类型
interface UserInfo {
  user_id: string;
  email?: string;
  token: string;
  expires_at: number;
}

// 用户详情类型
export interface UserDetails {
  email: string;
  // 添加其他可能的用户详情字段
  [key: string]: any;
}

// Symbol类型
export interface SymbolData {
  symbol: string;
  is_valid: boolean;
  create_ts: number;
}

// 获取存储的token
// function getAuthToken(): string | null {
//   const userInfoStr = localStorage.getItem("userInfo");
//   if (!userInfoStr) return null;

//   try {
//     // 使用安全的JSON解析
//     const userInfo = safeJsonParse<UserInfo>(userInfoStr, {
//       user_id: "",
//       token: "",
//       expires_at: 0,
//     });
//     return userInfo.token;
//   } catch (error) {
//     return null;
//   }
// }

// 检查响应是否为JSON
async function isJsonResponse(response: Response): Promise<boolean> {
  const contentType = response.headers.get("content-type");
  return contentType !== null && contentType.includes("application/json");
}

// 安全地解析JSON响应
async function safeParseJson<T>(response: Response): Promise<T> {
  try {
    // 先检查内容类型
    if (!(await isJsonResponse(response))) {
      // 如果不是JSON，获取文本内容以便调试
      const text = await response.text();
      console.error("非JSON响应:", text.substring(0, 200) + "...");
      throw new Error("服务器返回了非JSON格式的响应");
    }

    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      // 尝试获取原始响应文本以便调试
      try {
        const text = await response.text();
        console.error(
          "JSON解析错误，原始响应:",
          text.substring(0, 200) + "..."
        );
      } catch (e) {
        console.error("无法获取原始响应文本");
      }
      throw new Error("无法解析服务器响应为JSON格式");
    }
    throw error;
  }
}

// 通用API请求函数
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth = true
): Promise<T> {
  const url = `${config.apiBaseUrl}${endpoint}`;

  // 默认请求选项
  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
    },
    // 简化CORS设置，只使用必要的选项
    credentials: "include",
    mode: "cors",
  };

  // 合并选项
  const fetchOptions: RequestInit = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  // 如果需要认证，添加Authorization头部
  if (requiresAuth) {
    const token = getAuthToken();
    if (token) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  }

  console.log(`发送请求到: ${url}`, {
    method: fetchOptions.method,
    headers: fetchOptions.headers,
    hasBody: !!fetchOptions.body,
  });

  try {
    const response = await fetch(url, fetchOptions);

    // 检查响应状态
    if (!response.ok) {
      // 尝试解析错误响应
      if (await isJsonResponse(response)) {
        const errorData = await response.json();
        throw new Error(errorData.message || `请求失败: ${response.status}`);
      } else {
        // 如果不是JSON响应，获取文本内容
        const text = await response.text();
        console.error("错误响应内容:", text.substring(0, 200) + "...");
        throw new Error(`请求失败: ${response.status} ${response.statusText}`);
      }
    }

    // 安全解析JSON响应
    const result = await safeParseJson<ApiResponse<T>>(response);

    // 检查API返回的code
    if (result.code !== 0) {
      throw new Error(result.message || "请求失败");
    }

    return result.data;
  } catch (error) {
    // console.error("API请求错误:", error);
    throw error;
  }
}

// 登录API
export async function loginUser(email: string, password: string) {
  try {
    // 验证输入
    if (!email || !password) {
      throw new Error("邮箱和密码不能为空");
    }

    // console.log("尝试登录:", { email });

    const data = await apiRequest<LoginResponseData>(
      "/api/user/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
      false // 登录不需要认证
    );

    // 保存用户信息到本地存储，包括token
    const userInfo: UserInfo = {
      user_id: data.user_id,
      email: email, // 保存邮箱，因为服务器没有返回
      token: data.token,
      expires_at: data.expires_at,
    };

    // 确保localStorage操作完成
    localStorage.setItem("userInfo", JSON.stringify(userInfo));
    console.log("用户信息已保存到localStorage", userInfo);

    return data;
  } catch (error) {
    console.error("登录失败:", error);
    throw error;
  }
}

// 注册API
export async function registerUser(
  email: string,
  password: string,
  verificationCode: string,
  inviteCode = ""
) {
  // 验证输入
  if (!email || !password || !verificationCode) {
    throw new Error("必填字段不能为空");
  }

  return apiRequest(
    "/api/user/register",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        code: verificationCode,
        invite_code: inviteCode,
      }),
    },
    false // 注册不需要认证
  );
}

// 获取邮箱验证码API
export async function getEmailVerificationCode(email: string) {
  // 验证输入
  if (!email) {
    throw new Error("邮箱不能为空");
  }

  return apiRequest(
    "/api/user/verification_code",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
    false // 获取验证码不需要认证
  );
}

// 获取用户信息API
export async function getUserInfo(): Promise<UserDetails> {
  return apiRequest<UserDetails>("/api/user/info", { method: "GET" });
}

// 退出登录API
export async function logoutUser() {
  try {
    await apiRequest("/api/user/logout", { method: "POST" });
    // 清除本地存储的用户信息
    localStorage.removeItem("userInfo");
  } catch (error) {
    // 即使API调用失败，也清除本地存储
    localStorage.removeItem("userInfo");
    throw error;
  }
}

// 检查用户是否已登录
export function isLoggedIn(): boolean {
  try {
    const userInfoStr = localStorage.getItem("userInfo");
    if (!userInfoStr) return false;

    const userInfo = safeJsonParse<{ token: string; expires_at: number }>(
      userInfoStr,
      { token: "", expires_at: 0 }
    );

    // 检查token是否存在
    if (!userInfo.token) return false;

    // 检查token是否过期
    if (userInfo.expires_at && userInfo.expires_at * 1000 < Date.now()) {
      localStorage.removeItem("userInfo"); // 清除过期token
      return false;
    }

    return true;
  } catch (error) {
    // console.error("检查登录状态失败:", error);
    return false;
  }
}

// 获取市场符号列表
export async function getMarketSymbols(): Promise<SymbolData[]> {
  return apiRequest<SymbolData[]>("/api/market/plot", { method: "GET" });
}

// 添加市场符号
export async function addMarketSymbol(symbol: string): Promise<void> {
  if (!symbol) {
    throw new Error("符号不能为空");
  }

  return apiRequest<void>("/api/market/plot", {
    method: "POST",
    body: JSON.stringify({ symbol: symbol.toLowerCase() }),
  });
}

// 删除市场符号
export async function deleteMarketSymbol(symbol: string): Promise<void> {
  if (!symbol) {
    throw new Error("符号不能为空");
  }

  // return apiRequest<void>("/api/market/plot", {
  //   method: "DELETE",
  //   body: JSON.stringify({ symbol: symbol.toLowerCase() }),
  // });
  try {
    const url = `${config.apiBaseUrl}/api/market/plot`;
    const token = getAuthToken();

    if (!token) {
      throw new Error("未找到认证令牌");
    }

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ symbol: symbol.toLowerCase() }),
      credentials: "include",
      mode: "cors",
    });

    // 检查响应状态
    if (!response.ok) {
      // 尝试解析错误响应
      if (await isJsonResponse(response)) {
        const errorData = await response.json();
        throw new Error(errorData.message || `请求失败: ${response.status}`);
      } else {
        // 如果不是JSON响应，获取文本内容
        // const text = await response.text();
        // console.error("错误响应内容:", text.substring(0, 200) + "...");
        throw new Error(`请求失败: ${response.status} ${response.statusText}`);
      }
    }

    // 解析完整响应并返回
    const result = await response.json();
    return result;
  } catch (error) {
    // console.error("删除符号失败:", error);
    throw error;
  }
}
