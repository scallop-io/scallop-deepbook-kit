/**
 * DeepBook Margin Toolkit Demo | DeepBook Margin Toolkit 示範
 *
 * Complete reference to complete-margin-demo functionality | 完全參考 complete-margin-demo 的功能展示範例
 *
 * Includes | 包含：
 * 1. SUI Margin Pool complete flow (Withdraw all → Supply 0.1 SUI with Referral) | SUI Margin Pool 完整流程（提取所有 → 供應 0.1 SUI，含 Referral）
 * 2. DBUSDC Margin Pool complete flow (Withdraw all → Supply 10 DBUSDC with Referral) | DBUSDC Margin Pool 完整流程（提取所有 → 供應 10 DBUSDC，含 Referral）
 * 3. Referral creation, storage and query | Referral 創建、儲存和查詢
 * 4. Supply and withdraw operations | 供應和提取操作
 * 5. Balance change tracking | 餘額變化追蹤
 */

import { DeepBookMarginToolkit } from '../toolkit/index.js';
import { getConfig, getPrivateKey } from '../config.js';
import { setEnvVar, getEnvVar, displayEnvVars } from '../utils/env-manager.js';

// Interface definition | 介面定義
interface BalanceSnapshot {
  walletBalance: number;
  userSupplyAmount: number;
}

/**
 * Display balance changes | 顯示餘額變化
 */
function displayBalanceChanges(
  coinKey: string,
  before: BalanceSnapshot,
  after: BalanceSnapshot,
  operation: string
) {
  console.log(`\n  📊 ${operation} - ${coinKey} Balance Changes | ${operation} - ${coinKey} 餘額變化`);
  console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  const walletDiff = after.walletBalance - before.walletBalance;
  const userSupplyDiff = after.userSupplyAmount - before.userSupplyAmount;

  console.log(`  💰 Wallet Balance | 錢包餘額：`);
  console.log(`     Before | 變更前: ${before.walletBalance.toFixed(6)} ${coinKey}`);
  console.log(`     After | 變更後: ${after.walletBalance.toFixed(6)} ${coinKey}`);
  console.log(`     Change | 變化: ${walletDiff >= 0 ? '+' : ''}${walletDiff.toFixed(6)} ${coinKey}`);

  console.log(`\n  👤 Your Supply Amount | 您的供應金額：`);
  console.log(`     Before | 變更前: ${before.userSupplyAmount.toFixed(6)} ${coinKey}`);
  console.log(`     After | 變更後: ${after.userSupplyAmount.toFixed(6)} ${coinKey}`);
  console.log(`     Change | 變化: ${userSupplyDiff >= 0 ? '+' : ''}${userSupplyDiff.toFixed(6)} ${coinKey}\n`);
}

async function main() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║   DeepBook Margin Toolkit Demo                     ║');
    console.log('║   DeepBook Margin Toolkit 示範                      ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    // ═══════════════════════════════════════════════════════
    // Initialize: Create or Load Supplier Cap | 初始化：創建或載入 Supplier Cap
    // ═══════════════════════════════════════════════════════
    console.log('═'.repeat(60));
    console.log('  Initialize: Supplier Cap | 初始化：Supplier Cap');
    console.log('═'.repeat(60));

    const config = getConfig();
    const privateKey = getPrivateKey();

    // Load existing Supplier Cap ID if available | 載入現有的 Supplier Cap ID（如果有）
    const existingCapId = getEnvVar('SUPPLIER_CAP_ID');

    const toolkit = new DeepBookMarginToolkit({
      network: config.network,
      privateKey,
      supplierCapId: existingCapId || undefined,
    });

    console.log(`📍 Wallet Address | 錢包地址: ${toolkit.getAddress()}\n`);

    // Initialize (will create Supplier Cap if needed) | 初始化（需要時會創建 Supplier Cap）
    let supplierCapId = existingCapId;
    
    if (!supplierCapId) {
      console.log('📝 Creating new Supplier Cap... | 創建新的 Supplier Cap...\n');
      supplierCapId = await toolkit.initialize();
      console.log(`✅ Supplier Cap created successfully! | Supplier Cap 創建成功！`);
      console.log(`  Supplier Cap ID: ${supplierCapId}`);
      setEnvVar('SUPPLIER_CAP_ID', supplierCapId);
      console.log('✅ Supplier Cap ID saved to .env file | Supplier Cap ID 已儲存到 .env 檔案\n');
    } else {
      console.log('✅ Loaded Supplier Cap ID from environment variables | 從環境變數載入 Supplier Cap ID\n');
      await toolkit.initialize();
    }

    displayEnvVars(['SUPPLIER_CAP_ID']);

    // ═══════════════════════════════════════════════════════
    // Part 1: SUI Margin Pool Operations | SUI Margin Pool 操作
    // ═══════════════════════════════════════════════════════
    console.log('═'.repeat(60));
    console.log('  Part 1: SUI Margin Pool Operations | SUI Margin Pool 操作');
    console.log('═'.repeat(60));

    // 1. Create SUI Referral | 創建 SUI Referral
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Step 1: Create SUI Referral | 步驟 1: 創建 SUI Referral');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    let suiReferralId = getEnvVar('SUI_REFERRAL_ID');

    if (!suiReferralId) {
      console.log('\n📝 創建 SUI Supply Referral...\n');
      const newSuiReferralId = await toolkit.createSupplyReferral('SUI');

      if (newSuiReferralId) {
        suiReferralId = newSuiReferralId;
        console.log(`✅ Supply Referral 創建成功！`);
        console.log(`  Referral ID: ${suiReferralId}`);
        setEnvVar('SUI_REFERRAL_ID', suiReferralId);
        console.log('✅ SUI Referral ID 已儲存到 .env 檔案\n');
      }
    } else {
      console.log('\n✅ 從環境變數載入 SUI Referral ID\n');
    }

    // 2. 提取所有已供應的 SUI（如果有的話）
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  步驟 2: 提取所有已供應的 SUI');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 查詢當前狀態
    const suiBeforeWithdrawAll = await toolkit.getBalance('SUI');

    console.log(`\n  ℹ️  當前您的供應金額: ${suiBeforeWithdrawAll.userSupplyAmount.toFixed(6)} SUI`);

    if (suiBeforeWithdrawAll.userSupplyAmount > 0) {
      console.log(`  ➡️ 提取所有已供應的 SUI...`);
      await toolkit.withdrawFromMarginPool('SUI');
      console.log(`  ✅ 提取成功！\n`);
    } else {
      console.log(`  ➜ 沒有已供應的 SUI，跳過提取步驟`);
    }

    const suiAfterWithdrawAll = await toolkit.getBalance('SUI');
    displayBalanceChanges('SUI', suiBeforeWithdrawAll, suiAfterWithdrawAll, 'Withdraw All Supplied SUI | 提取所有已供應的 SUI');

    // 3. Supply 0.1 SUI | 供應 0.1 SUI
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Step 3: Supply 0.1 SUI to Margin Pool | 步驟 3: 供應 0.1 SUI 到 Margin Pool');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const suiBeforeSupply = await toolkit.getBalance('SUI');

    const suiSupplyAmount = 0.1;
    console.log(`\n💰 Supplying ${suiSupplyAmount} SUI to Margin Pool... | 供應 ${suiSupplyAmount} SUI 到 Margin Pool...\n`);
    await toolkit.supplyToMarginPool('SUI', suiSupplyAmount, suiReferralId || undefined);
    console.log(`✅ Supply successful! | 供應成功！\n`);

    const suiAfterSupply = await toolkit.getBalance('SUI');
    displayBalanceChanges('SUI', suiBeforeSupply, suiAfterSupply, 'Supply 0.1 SUI | 供應 0.1 SUI');

    // ═══════════════════════════════════════════════════════
    // Part 2: DBUSDC Margin Pool Operations | DBUSDC Margin Pool 操作
    // ═══════════════════════════════════════════════════════
    console.log('═'.repeat(60));
    console.log('  Part 2: DBUSDC Margin Pool Operations | DBUSDC Margin Pool 操作');
    console.log('═'.repeat(60));

    // 1. Create DBUSDC Referral | 創建 DBUSDC Referral
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Step 1: Create DBUSDC Referral | 步驟 1: 創建 DBUSDC Referral');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    let dbusdcReferralId = getEnvVar('DBUSDC_REFERRAL_ID');

    if (!dbusdcReferralId) {
      console.log('\n📝 創建 DBUSDC Supply Referral...\n');
      const newDbusdcReferralId = await toolkit.createSupplyReferral('DBUSDC');

      if (newDbusdcReferralId) {
        dbusdcReferralId = newDbusdcReferralId;
        console.log(`✅ Supply Referral 創建成功！`);
        console.log(`  Referral ID: ${dbusdcReferralId}`);
        setEnvVar('DBUSDC_REFERRAL_ID', dbusdcReferralId);
        console.log('✅ DBUSDC Referral ID 已儲存到 .env 檔案\n');
      }
    } else {
      console.log('\n✅ 從環境變數載入 DBUSDC Referral ID\n');
    }

    // 2. 提取所有已供應的 DBUSDC
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  步驟 2: 提取所有已供應的 DBUSDC');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const dbusdcBeforeWithdrawAll = await toolkit.getBalance('DBUSDC');

    console.log(`\n  ℹ️  當前您的供應金額: ${dbusdcBeforeWithdrawAll.userSupplyAmount.toFixed(6)} DBUSDC`);

    if (dbusdcBeforeWithdrawAll.userSupplyAmount > 0) {
      console.log(`  ➡️ 提取所有已供應的 DBUSDC...`);
      await toolkit.withdrawFromMarginPool('DBUSDC');
      console.log(`  ✅ 提取成功！\n`);
    } else {
      console.log(`  ➜ 沒有已供應的 DBUSDC，跳過提取步驟`);
    }

    const dbusdcAfterWithdrawAll = await toolkit.getBalance('DBUSDC');
    displayBalanceChanges('DBUSDC', dbusdcBeforeWithdrawAll, dbusdcAfterWithdrawAll, 'Withdraw All Supplied DBUSDC | 提取所有已供應的 DBUSDC');

    // 3. Supply 10 DBUSDC | 供應 10 DBUSDC
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Step 3: Supply 10 DBUSDC to Margin Pool | 步驟 3: 供應 10 DBUSDC 到 Margin Pool');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const dbusdcBeforeSupply = await toolkit.getBalance('DBUSDC');

    const dbusdcSupplyAmount = 10;
    console.log(`\n💰 Supplying ${dbusdcSupplyAmount} DBUSDC to Margin Pool... | 供應 ${dbusdcSupplyAmount} DBUSDC 到 Margin Pool...\n`);
    await toolkit.supplyToMarginPool('DBUSDC', dbusdcSupplyAmount, dbusdcReferralId || undefined);
    console.log(`✅ Supply successful! | 供應成功！\n`);

    const dbusdcAfterSupply = await toolkit.getBalance('DBUSDC');
    displayBalanceChanges('DBUSDC', dbusdcBeforeSupply, dbusdcAfterSupply, 'Supply 10 DBUSDC | 供應 10 DBUSDC');

    // ═══════════════════════════════════════════════════════
    // Summary | 總結
    // ═══════════════════════════════════════════════════════
    console.log('═'.repeat(60));
    console.log('  Operations Summary | 操作總結');
    console.log('═'.repeat(60));

    console.log('\n✅ All operations completed! | 所有操作完成！\n');

    console.log('📊 Final State | 最終狀態：\n');

    console.log('  SUI Margin Pool | SUI Margin Pool：');
    console.log(`    • Your supply amount | 您的供應金額: ${suiAfterSupply.userSupplyAmount.toFixed(6)} SUI`);
    console.log(`    • Wallet balance | 錢包餘額: ${suiAfterSupply.walletBalance.toFixed(6)} SUI\n`);

    console.log('  DBUSDC Margin Pool | DBUSDC Margin Pool：');
    console.log(`    • Your supply amount | 您的供應金額: ${dbusdcAfterSupply.userSupplyAmount.toFixed(6)} DBUSDC`);
    console.log(`    • Wallet balance | 錢包餘額: ${dbusdcAfterSupply.walletBalance.toFixed(6)} DBUSDC\n`);

    console.log('💾 Saved Environment Variables | 已儲存的環境變數：');
    displayEnvVars(['SUPPLIER_CAP_ID', 'SUI_REFERRAL_ID', 'DBUSDC_REFERRAL_ID']);

    console.log('═'.repeat(60));
    console.log('\n✨ Demo completed! | 示範程式執行完成！\n');

  } catch (error: any) {
    console.error('\n❌ Error occurred during execution | 執行過程中發生錯誤:');
    console.error(`Error message | 錯誤訊息: ${error.message || error}`);
    if (error.stack) {
      console.error('\nError stack | 錯誤堆疊:');
      console.error(error.stack);
    }
    console.log('\n💡 Tips | 提示：');
    console.log('  - Ensure you have enough SUI and DBUSDC balance | 確保您有足夠的 SUI 和 DBUSDC 餘額');
    console.log('  - Ensure environment variables are set correctly | 確保環境變數設定正確');
    console.log('  - Try running `pnpm merge-coins` to merge coins | 嘗試執行 `pnpm merge-coins` 合併代幣\n');
    process.exit(1);
  }
}

main();
