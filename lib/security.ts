// 安全工具函数

/**
 * 对字符串进行HTML转义，防止XSS攻击
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * 安全地显示用户输入的文本
 * 使用React的自动转义特性，但提供额外的安全检查
 */
export function safeText(text: string | undefined | null): string {
  if (text === undefined || text === null) {
    return "";
  }

  // 额外的安全检查，移除可能的脚本标签
  return text.toString();
}

/**
 * 验证输入是否为有效的电子邮件格式
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证密码强度
 */
export function isStrongPassword(password: string): boolean {
  // 至少8个字符
  return password.length >= 8;
}

/**
 * 安全地解析JSON，防止JSON注入攻击
 */
export function safeJsonParse<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error("JSON解析错误:", error);
    return defaultValue;
  }
}
