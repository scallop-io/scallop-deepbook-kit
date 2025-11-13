# Scallop DeepBook Kit

A comprehensive toolkit for interacting with DeepBook V3 Margin Pools on the Sui blockchain.
一個在 Sui 區塊鏈上與 DeepBook V3 Margin Pools 互動的完整工具套件。

## Features | 功能特色

- **DeepBook V3 Integration** | **DeepBook V3 整合**
  Complete integration with DeepBook V3 Margin Pool system
  完整整合 DeepBook V3 Margin Pool 系統

- **Simplified API** | **簡化的 API**
  Clean and intuitive API for complex margin operations
  簡潔直觀的 API，處理複雜的 margin 操作

- **Supplier Cap Management** | **Supplier Cap 管理**
  Automatic creation and management of Supplier Credentials
  自動創建和管理供應者憑證

- **Referral System** | **推薦系統**
  Built-in referral creation and fee withdrawal support
  內建推薦系統創建和費用提取支援

- **Balance Tracking** | **餘額追蹤**
  Query wallet and margin pool balances in real-time
  即時查詢錢包和 margin pool 餘額

- **TypeScript Support** | **TypeScript 支援**
  Full TypeScript support with comprehensive type definitions
  完整的 TypeScript 支援與詳盡的型別定義

- **Environment Management** | **環境管理**
  Easy-to-use environment variable management utilities
  易於使用的環境變數管理工具

## Prerequisites | 環境需求

- **Node.js** >= 18.0.0
- **pnpm** >= 9.0.0
- **Sui Testnet Account** with SUI and DBUSDC balance
  **Sui 測試網帳戶**，需包含 SUI 和 DBUSDC 餘額

## Installation | 安裝

```bash
# Clone the repository | 克隆儲存庫
git clone https://github.com/your-username/scallop-deepbook-kit.git
cd scallop-deepbook-kit

# Install dependencies | 安裝依賴
pnpm install

# Setup environment variables | 設定環境變數
cp .env.example .env
# Edit .env and add your PRIVATE_KEY | 編輯 .env 並新增您的 PRIVATE_KEY
```

## Quick Start | 快速開始

### 1. Configure Environment | 配置環境

Create a `.env` file in the project root:
在專案根目錄建立 `.env` 檔案：

```env
# Required: Your wallet private key (hex format, without 0x prefix)
# 必需：您的錢包私鑰（hex 格式，不含 0x 前綴）
PRIVATE_KEY=your_private_key_here

# Optional: These will be auto-generated and saved
# 可選：這些會自動產生並儲存
# SUPPLIER_CAP_ID=
# SUI_REFERRAL_ID=
# DBUSDC_REFERRAL_ID=
```

### 2. Run the Demo | 執行示範

```bash
# Run the complete toolkit demo | 執行完整的 toolkit 示範
pnpm example:toolkit
```

The demo will:
示範程式將會：

- Create or load Supplier Cap | 創建或載入 Supplier Cap
- Create referrals for SUI and DBUSDC | 為 SUI 和 DBUSDC 創建 referrals
- Withdraw all existing supplies | 提取所有現有的供應
- Supply 0.1 SUI and 10 DBUSDC to margin pools | 供應 0.1 SUI 和 10 DBUSDC 到 margin pools
- Track and display balance changes | 追蹤並顯示餘額變化

### 3. Use the Toolkit in Your Code | 在程式碼中使用 Toolkit

```typescript
import { DeepBookMarginToolkit } from './toolkit';

// Initialize the toolkit | 初始化 toolkit
const toolkit = new DeepBookMarginToolkit({
  network: 'testnet',
  privateKey: process.env.PRIVATE_KEY!,
  supplierCapId: process.env.SUPPLIER_CAP_ID, // Optional | 可選
});

// Initialize (creates Supplier Cap if needed) | 初始化（需要時創建 Supplier Cap）
await toolkit.initialize();

// Create a referral | 創建 referral
const referralId = await toolkit.createSupplyReferral('SUI');

// Supply to margin pool | 供應到 margin pool
await toolkit.supplyToMarginPool('SUI', 0.1, referralId);

// Get balance | 查詢餘額
const balance = await toolkit.getBalance('SUI');
console.log(`Supply amount: ${balance.userSupplyAmount}`);
console.log(`Wallet balance: ${balance.walletBalance}`);

// Withdraw from margin pool | 從 margin pool 提取
await toolkit.withdrawFromMarginPool('SUI'); // Withdraws all | 提取全部

// Withdraw referral fees | 提取 referral 費用
await toolkit.withdrawReferralFees('SUI', referralId);
```

## API Reference | API 參考

### DeepBookMarginToolkit

#### Constructor | 建構函式

```typescript
new DeepBookMarginToolkit(config: ToolkitConfig)
```

**Parameters | 參數:**

- `config.network`: `'testnet' | 'mainnet'` - Network type | 網路類型
- `config.privateKey`: `string` - Private key (hex, no 0x prefix) | 私鑰（hex 格式，無 0x 前綴）
- `config.supplierCapId?`: `string` - Optional existing Supplier Cap ID | 可選的現有 Supplier Cap ID

#### Methods | 方法

##### `initialize(): Promise<string>`

Initialize the toolkit and create Supplier Cap if needed.
初始化 toolkit 並在需要時創建 Supplier Cap。

**Returns | 返回:** Supplier Cap ID

##### `createSupplyReferral(coin: MarginCoinType): Promise<string | null>`

Create a supply referral for the specified coin.
為指定的幣種創建供應 referral。

**Parameters | 參數:**

- `coin`: `'SUI' | 'DBUSDC'` - Coin type | 幣種

**Returns | 返回:** Referral ID or null

##### `supplyToMarginPool(coin: MarginCoinType, amount: number, referralId?: string): Promise<boolean>`

Supply funds to the margin pool.
供應資金到 margin pool。

**Parameters | 參數:**

- `coin`: `'SUI' | 'DBUSDC'` - Coin type | 幣種
- `amount`: `number` - Amount in human-readable units | 人類可讀單位的金額
- `referralId?`: `string` - Optional referral ID | 可選的 referral ID

**Returns | 返回:** Success status

##### `withdrawFromMarginPool(coin: MarginCoinType, amount?: number): Promise<boolean>`

Withdraw funds from the margin pool.
從 margin pool 提取資金。

**Parameters | 參數:**

- `coin`: `'SUI' | 'DBUSDC'` - Coin type | 幣種
- `amount?`: `number` - Optional amount, omit to withdraw all | 可選的金額，省略則提取全部

**Returns | 返回:** Success status

##### `withdrawReferralFees(coin: MarginCoinType, referralId: string): Promise<boolean>`

Withdraw accumulated referral fees.
提取累積的 referral 費用。

**Parameters | 參數:**

- `coin`: `'SUI' | 'DBUSDC'` - Coin type | 幣種
- `referralId`: `string` - Referral Object ID | Referral 物件 ID

**Returns | 返回:** Success status

##### `getBalance(coin: MarginCoinType): Promise<MarginBalance>`

Query margin balance for a coin.
查詢幣種的 margin 餘額。

**Parameters | 參數:**

- `coin`: `'SUI' | 'DBUSDC'` - Coin type | 幣種

**Returns | 返回:** Balance information with `userSupplyAmount` and `walletBalance`

##### `getAddress(): string`

Get the wallet address.
獲取錢包地址。

**Returns | 返回:** Wallet address

##### `getSupplierCapId(): string | undefined`

Get the Supplier Cap ID.
獲取 Supplier Cap ID。

**Returns | 返回:** Supplier Cap ID or undefined

## Development Commands | 開發指令

### Build | 建置

```bash
pnpm build          # Compile TypeScript | 編譯 TypeScript
pnpm build:watch    # Watch mode compilation | 監聽模式編譯
pnpm clean          # Remove build artifacts | 清除建置檔案
```

### Code Quality | 程式碼品質

```bash
pnpm lint           # Check code style with ESLint | 使用 ESLint 檢查程式碼風格
pnpm lint:fix       # Auto-fix ESLint issues | 自動修正 ESLint 問題
pnpm format         # Format code with Prettier | 使用 Prettier 格式化程式碼
pnpm format:check   # Check code formatting | 檢查程式碼格式
```

### Testing | 測試

```bash
pnpm test           # Run tests | 執行測試
pnpm test:watch     # Run tests in watch mode | 監聽模式執行測試
pnpm test:coverage  # Generate coverage report | 產生覆蓋率報告
```

### Examples | 範例

```bash
pnpm example:toolkit  # Run the DeepBook Margin Toolkit demo | 執行 DeepBook Margin Toolkit 示範
```

## Project Structure | 專案結構

```
.
├── src/
│   ├── toolkit/                    # Core toolkit implementation | 核心 toolkit 實作
│   │   ├── DeepBookMarginToolkit.ts  # Main toolkit class | 主要 toolkit 類別
│   │   ├── types.ts                  # Type definitions | 型別定義
│   │   └── index.ts                  # Exports | 匯出
│   ├── examples/                   # Example scripts | 範例程式
│   │   └── toolkit-demo.ts          # Complete demo | 完整示範
│   ├── utils/                      # Utility functions | 工具函式
│   │   └── env-manager.ts           # Environment variable management | 環境變數管理
│   ├── config.ts                   # Configuration loader | 配置載入器
│   └── testnet-config.ts           # Testnet constants | 測試網常數
├── tests/                          # Test files | 測試檔案
├── dist/                           # Build output (git-ignored) | 建置輸出（git 忽略）
└── .env                            # Environment variables (git-ignored) | 環境變數（git 忽略）
```

## Tech Stack | 技術堆疊

### Core Dependencies | 核心依賴

- **[@mysten/sui](https://www.npmjs.com/package/@mysten/sui)** ^1.44.0 - Sui blockchain SDK | Sui 區塊鏈 SDK
- **[@mysten/deepbook-v3](https://www.npmjs.com/package/@mysten/deepbook-v3)** ^0.20.2 - DeepBook V3 SDK
- **[dotenv](https://www.npmjs.com/package/dotenv)** ^17.2.3 - Environment variable management | 環境變數管理

### Development Tools | 開發工具

- **[TypeScript](https://www.typescriptlang.org/)** ^5.9.3 - Type-safe JavaScript | 型別安全的 JavaScript
- **[Jest](https://jestjs.io/)** ^30.2.0 - Testing framework | 測試框架
- **[ESLint](https://eslint.org/)** ^9.39.1 - Code linting | 程式碼檢查
- **[Prettier](https://prettier.io/)** ^3.6.2 - Code formatting | 程式碼格式化
- **[tsx](https://www.npmjs.com/package/tsx)** ^4.19.2 - TypeScript execution | TypeScript 執行工具

### Package Manager | 套件管理器

- **[pnpm](https://pnpm.io/)** ^10.21.0 - Fast, disk space efficient package manager | 快速、節省磁碟空間的套件管理器

## Configuration | 配置

### Testnet Configuration | 測試網配置

The toolkit uses predefined testnet configurations for:
toolkit 使用預定義的測試網配置：

- **Coins | 幣種**: SUI, DBUSDC, DEEP
- **Pools | 池子**: SUI/DBUSDC trading pool
- **Margin Pools | Margin 池子**: SUI and DBUSDC margin pools

These configurations are defined in `src/testnet-config.ts`.
這些配置定義於 `src/testnet-config.ts`。

## Environment Variables | 環境變數

| Variable             | Description                     | Required | Auto-generated |
| -------------------- | ------------------------------- | -------- | -------------- |
| `PRIVATE_KEY`        | Wallet private key (hex, no 0x) | ✅ Yes   | ❌ No          |
| `SUPPLIER_CAP_ID`    | Supplier Cap Object ID          | ❌ No    | ✅ Yes         |
| `SUI_REFERRAL_ID`    | SUI Supply Referral ID          | ❌ No    | ✅ Yes         |
| `DBUSDC_REFERRAL_ID` | DBUSDC Supply Referral ID       | ❌ No    | ✅ Yes         |

| 變數                 | 說明                    | 必需  | 自動產生 |
| -------------------- | ----------------------- | ----- | -------- |
| `PRIVATE_KEY`        | 錢包私鑰（hex，無 0x）  | ✅ 是 | ❌ 否    |
| `SUPPLIER_CAP_ID`    | Supplier Cap 物件 ID    | ❌ 否 | ✅ 是    |
| `SUI_REFERRAL_ID`    | SUI 供應 Referral ID    | ❌ 否 | ✅ 是    |
| `DBUSDC_REFERRAL_ID` | DBUSDC 供應 Referral ID | ❌ 否 | ✅ 是    |

## Troubleshooting | 疑難排解

### Common Issues | 常見問題

**Issue | 問題:** "Supplier Cap not initialized"
**Solution | 解決方法:** Call `await toolkit.initialize()` before using other methods | 在使用其他方法前呼叫 `await toolkit.initialize()`

**Issue | 問題:** Transaction fails due to insufficient balance
**Solution | 解決方法:** Ensure you have enough SUI and DBUSDC in your wallet | 確保錢包中有足夠的 SUI 和 DBUSDC

**Issue | 問題:** "Failed to create Supplier Cap"
**Solution | 解決方法:** Check network connectivity and wallet balance | 檢查網路連線和錢包餘額

## Contributing | 貢獻

Contributions are welcome! Please feel free to submit a Pull Request.
歡迎貢獻！請隨時提交 Pull Request。

## License | 授權

MIT License - see [LICENSE](LICENSE) file for details.
MIT 授權 - 詳情請見 [LICENSE](LICENSE) 檔案。

## Links | 連結

- [DeepBook Documentation](https://docs.sui.io/standards/deepbookv3-sdk)
- [Sui Documentation](https://docs.sui.io/)
- [DeepBook V3 SDK](https://www.npmjs.com/package/@mysten/deepbook-v3)
- [Sui TypeScript SDK](https://www.npmjs.com/package/@mysten/sui)

---

**Made with ❤️ for the Sui and DeepBook community**
**用 ❤️ 為 Sui 和 DeepBook 社群打造**
