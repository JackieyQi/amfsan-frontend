// 环境变量配置
const config = {
  // API基础URL - 使用相对路径或完整URL
  apiBaseUrl:
    process.env.NEXT_PUBLIC_USE_PROXY === "true"
      ? "" // 如果使用代理，使用相对路径
      : (
          process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"
        ).replace(/\/$/, ""),

  // 其他全局配置
  appName: "AMFSAN",

  // 环境判断
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
};

export default config;
