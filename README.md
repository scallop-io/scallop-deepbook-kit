# Scallop DeepBook Kit

一個用於整合 Scallop 與 DeepBook 功能的工具套件，建構於 Sui 區塊鏈之上。

## 功能特色

- 與 DeepBook DEX 整合
- 與 Scallop 協議整合
- TypeScript 支援，提供完整的型別定義
- 完善的測試覆蓋率

## 安裝

```bash
npm install
```

## 開發指令

### 建置專案

```bash
npm run build          # 建置專案
npm run build:watch    # 監聽模式建置
npm run clean          # 清除建置檔案
```

### 程式碼品質

```bash
npm run lint           # 檢查程式碼風格
npm run lint:fix       # 自動修正程式碼風格問題
npm run format         # 格式化程式碼
npm run format:check   # 檢查程式碼格式
```

### 測試

```bash
npm test               # 執行測試
npm run test:watch     # 監聽模式執行測試
npm run test:coverage  # 執行測試並產生覆蓋率報告
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
