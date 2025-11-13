/**
 * Environment variable management utility | 環境變數管理工具
 *
 * Uses dotenv for reading and custom logic for writing .env files | 使用 dotenv 讀取並自定義邏輯寫入 .env 檔案
 * dotenv provides reliable environment variable loading | dotenv 提供可靠的環境變數載入
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const ENV_FILE_PATH = path.join(process.cwd(), '.env');

// Initialize dotenv on module load | 模組載入時初始化 dotenv
dotenv.config();

/**
 * Parse .env file content into key-value pairs | 解析 .env 檔案內容為鍵值對
 *
 * @param content - Raw .env file content | 原始 .env 檔案內容
 * @returns Map of environment variables | 環境變數映射表
 */
function parseEnvContent(content: string): Map<string, string> {
  const envMap = new Map<string, string>();
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    // Skip empty lines and comments | 跳過空行和註解
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex > 0) {
      const key = trimmedLine.substring(0, equalIndex).trim();
      let value = trimmedLine.substring(equalIndex + 1).trim();

      // Remove surrounding quotes if present | 移除周圍的引號（如果存在）
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      envMap.set(key, value);
    }
  }

  return envMap;
}

/**
 * Read .env file content | 讀取 .env 檔案內容
 *
 * @returns Map of environment variables | 環境變數映射表
 */
function readEnvFile(): Map<string, string> {
  if (!fs.existsSync(ENV_FILE_PATH)) {
    return new Map<string, string>();
  }

  try {
    const content = fs.readFileSync(ENV_FILE_PATH, 'utf-8');
    return parseEnvContent(content);
  } catch (error) {
    console.error('Error reading .env file | 讀取 .env 檔案時發生錯誤:', error);
    return new Map<string, string>();
  }
}

/**
 * Preserve comments and empty lines from original .env file | 保留原始 .env 檔案中的註解和空行
 *
 * @returns Array of comment and empty lines | 註解和空行陣列
 */
function preserveComments(): string[] {
  const preservedLines: string[] = [];

  if (!fs.existsSync(ENV_FILE_PATH)) {
    return preservedLines;
  }

  try {
    const content = fs.readFileSync(ENV_FILE_PATH, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      // Preserve comments and empty lines | 保留註解和空行
      if (trimmedLine.startsWith('#') || !trimmedLine) {
        preservedLines.push(line);
      }
    }
  } catch (error) {
    console.error('Error preserving comments | 保留註解時發生錯誤:', error);
  }

  return preservedLines;
}

/**
 * Write environment variables to .env file | 寫入環境變數到 .env 檔案
 *
 * Preserves comments and formatting | 保留註解和格式
 *
 * @param envMap - Environment variables to write | 要寫入的環境變數
 */
function writeEnvFile(envMap: Map<string, string>): void {
  try {
    const lines: string[] = [];

    // Add preserved comments at the beginning | 在開頭加入保留的註解
    const comments = preserveComments();
    lines.push(...comments);

    // Add a separator if there are comments | 如果有註解則加入分隔符
    if (comments.length > 0) {
      const lastComment = comments[comments.length - 1];
      if (lastComment && lastComment.trim() !== '') {
        lines.push('');
      }
    }

    // Write environment variables in sorted order for consistency | 按排序順序寫入環境變數以保持一致性
    const sortedEntries = Array.from(envMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    for (const [key, value] of sortedEntries) {
      // Quote values that contain spaces or special characters | 為包含空格或特殊字元的值加引號
      const needsQuotes = value.includes(' ') || value.includes('#');
      const formattedValue = needsQuotes ? `"${value}"` : value;
      lines.push(`${key}=${formattedValue}`);
    }

    // Ensure file ends with newline | 確保檔案以換行結尾
    const content = lines.join('\n') + '\n';
    fs.writeFileSync(ENV_FILE_PATH, content, 'utf-8');

    console.log(`✅ Environment variables written to .env | 環境變數已寫入 .env`);
  } catch (error) {
    console.error('❌ Error writing .env file | 寫入 .env 檔案時發生錯誤:', error);
    throw error;
  }
}

/**
 * Set environment variable to .env file and process.env | 設置環境變數到 .env 檔案和 process.env
 *
 * @param key - Variable name | 變數名稱
 * @param value - Variable value | 變數值
 *
 * @example
 * ```typescript
 * setEnvVar('SUPPLIER_CAP_ID', '0x123abc...');
 * ```
 */
export function setEnvVar(key: string, value: string): void {
  if (!key || typeof value === 'undefined') {
    throw new Error('Key and value are required | 鍵和值為必填項');
  }

  const envMap = readEnvFile();
  envMap.set(key, value);
  writeEnvFile(envMap);

  // Update process.env immediately | 立即更新 process.env
  process.env[key] = value;

  console.log(`✅ Set ${key} in .env and process.env | 已在 .env 和 process.env 中設置 ${key}`);
}

/**
 * Get environment variable from process.env | 從 process.env 取得環境變數
 *
 * Uses process.env which is populated by dotenv | 使用由 dotenv 填充的 process.env
 *
 * @param key - Variable name | 變數名稱
 * @param defaultValue - Default value if not found | 找不到時的預設值
 * @returns Variable value or default | 變數值或預設值
 *
 * @example
 * ```typescript
 * const capId = getEnvVar('SUPPLIER_CAP_ID');
 * const network = getEnvVar('NETWORK', 'testnet');
 * ```
 */
export function getEnvVar(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}

/**
 * Get required environment variable or throw error | 取得必需的環境變數或拋出錯誤
 *
 * @param key - Variable name | 變數名稱
 * @returns Variable value | 變數值
 * @throws Error if variable is not set | 如果變數未設置則拋出錯誤
 *
 * @example
 * ```typescript
 * const privateKey = getRequiredEnvVar('PRIVATE_KEY');
 * ```
 */
export function getRequiredEnvVar(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(
      `Required environment variable ${key} is not set | 必需的環境變數 ${key} 未設置\n` +
        `Please add it to your .env file | 請將其添加到您的 .env 檔案中`
    );
  }

  return value;
}

/**
 * Set multiple environment variables in batch | 批量設置多個環境變數
 *
 * @param vars - Environment variable key-value pairs | 環境變數鍵值對
 *
 * @example
 * ```typescript
 * setEnvVars({
 *   SUPPLIER_CAP_ID: '0x123...',
 *   SUI_REFERRAL_ID: '0x456...',
 * });
 * ```
 */
export function setEnvVars(vars: Record<string, string>): void {
  if (!vars || Object.keys(vars).length === 0) {
    console.warn('⚠️  No variables provided | 未提供變數');
    return;
  }

  const envMap = readEnvFile();

  for (const [key, value] of Object.entries(vars)) {
    if (key && typeof value !== 'undefined') {
      envMap.set(key, value);
      process.env[key] = value;
    }
  }

  writeEnvFile(envMap);

  console.log(
    `✅ Set ${Object.keys(vars).length} variables in .env | 已在 .env 中設置 ${Object.keys(vars).length} 個變數`
  );
}

/**
 * Check if environment variable exists | 檢查環境變數是否存在
 *
 * @param key - Variable name | 變數名稱
 * @returns true if exists | 如果存在則返回 true
 *
 * @example
 * ```typescript
 * if (hasEnvVar('SUPPLIER_CAP_ID')) {
 *   console.log('Supplier Cap ID is set');
 * }
 * ```
 */
export function hasEnvVar(key: string): boolean {
  return typeof process.env[key] !== 'undefined' && process.env[key] !== '';
}

/**
 * Delete environment variable from .env file and process.env | 從 .env 檔案和 process.env 刪除環境變數
 *
 * @param key - Variable name to delete | 要刪除的變數名稱
 *
 * @example
 * ```typescript
 * deleteEnvVar('OLD_CONFIG');
 * ```
 */
export function deleteEnvVar(key: string): void {
  const envMap = readEnvFile();

  if (envMap.has(key)) {
    envMap.delete(key);
    writeEnvFile(envMap);
    delete process.env[key];
    console.log(`✅ Deleted ${key} from .env | 已從 .env 刪除 ${key}`);
  } else {
    console.warn(`⚠️  Variable ${key} not found | 變數 ${key} 未找到`);
  }
}

/**
 * Display specified environment variables | 顯示指定的環境變數
 *
 * @param keys - List of variable names to display | 要顯示的變數名稱列表
 *
 * @example
 * ```typescript
 * displayEnvVars(['NETWORK', 'SUPPLIER_CAP_ID', 'SUI_REFERRAL_ID']);
 * ```
 */
export function displayEnvVars(keys: string[]): void {
  console.log('\n📋 Environment Variables | 環境變數：');
  console.log('━'.repeat(60));

  for (const key of keys) {
    const value = getEnvVar(key);

    if (value) {
      // For long strings (like Object ID) only show beginning and end | 對於長字串（如 Object ID）只顯示前後部分
      const displayValue =
        value.length > 50
          ? `${value.substring(0, 20)}...${value.substring(value.length - 20)}`
          : value;
      console.log(`   ${key} = ${displayValue}`);
    } else {
      console.log(`   ${key} = (Not set | 未設置)`);
    }
  }

  console.log('━'.repeat(60));
  console.log('');
}

/**
 * Display all environment variables | 顯示所有環境變數
 *
 * @example
 * ```typescript
 * displayAllEnvVars();
 * ```
 */
export function displayAllEnvVars(): void {
  const envMap = readEnvFile();
  const keys = Array.from(envMap.keys()).sort();
  displayEnvVars(keys);
}

/**
 * Reload environment variables from .env file | 從 .env 檔案重新載入環境變數
 *
 * Useful after manual .env file edits | 在手動編輯 .env 檔案後很有用
 *
 * @example
 * ```typescript
 * reloadEnv();
 * ```
 */
export function reloadEnv(): void {
  try {
    dotenv.config({ override: true });
    console.log('✅ Environment variables reloaded | 環境變數已重新載入');
  } catch (error) {
    console.error('❌ Error reloading environment | 重新載入環境時發生錯誤:', error);
    throw error;
  }
}
