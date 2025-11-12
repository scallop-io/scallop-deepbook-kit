# Scallop DeepBook Kit

一個用於整合 Scallop 與 DeepBook 功能的工具套件，建構於 Sui 區塊鏈之上。

## 功能特色

- 與 DeepBook DEX 整合
- 與 Scallop 協議整合
- TypeScript 支援，提供完整的型別定義
- 完善的測試覆蓋率

## 安裝

```bash
pnpm install
```

## 開發指令

### 建置專案

```bash
pnpm build          # 建置專案
pnpm build:watch    # 監聽模式建置
pnpm clean          # 清除建置檔案
```

### 程式碼品質

```bash
pnpm lint           # 檢查程式碼風格
pnpm lint:fix       # 自動修正程式碼風格問題
pnpm format         # 格式化程式碼
pnpm format:check   # 檢查程式碼格式
```

### 測試

```bash
pnpm test               # 執行測試
pnpm test:watch         # 監聽模式執行測試
pnpm test:coverage      # 執行測試並產生覆蓋率報告
```

## 專案結構

```
.
├── src/
│   ├── types/         # 型別定義
│   ├── deepbook/      # DeepBook 整合模組
│   ├── scallop/       # Scallop 整合模組
│   ├── utils/         # 工具函式
│   └── index.ts       # 主要入口點
├── tests/             # 測試檔案
├── dist/              # 建置輸出目錄
└── data/              # 資料目錄（git 已忽略）
```

## 技術堆疊

- TypeScript 5.3+
- Node.js 18+
- @mysten/sui - Sui SDK
- Jest - 測試框架
- ESLint & Prettier - 程式碼品質工具

## 授權

MIT
