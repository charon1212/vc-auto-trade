import { asyncExecution } from "../Common/util";
import handleError from "../HandleError/handleError";
import { Balance, Execution, ExecutionAggregated, Order } from "../Interfaces/DomainType";
import { importProductContextFromDb, saveProductContext } from "./context";
import saveExecutionHistory from "./ExecutionHistory/saveExecutionHistory";
import { getBalances } from "./InputPhase/getBalances";
import { getExecutions } from "./InputPhase/getExecutions";
import { getLongAggregatedExecutions } from "./InputPhase/getLongAggregatedExecutions";
import { getOrders } from "./InputPhase/getOrders";
import { getShortAggregatedExecutions } from "./InputPhase/getShortAggregatedExecutions";
import { ProductSetting, productSettings } from "./productSettings";

export const entry = async () => {

  const now = new Date();
  const before1min = new Date(now.getTime() - 60 * 1000);

  await importProductContextFromDb();

  const promiseList: Promise<any>[] = [];
  for (let productSetting of productSettings) {
    promiseList.push(productEntryOrg(productSetting, before1min));
  }
  await Promise.all(promiseList);

  await saveProductContext();
  return '';

};

/** プロダクトごとのエントリー(編集前) */
const productEntryOrg = async (productSetting: ProductSetting, before1min: Date) => {

  await saveExecutionHistory(productSetting.productCode, before1min);

};

/** プロダクトごとのエントリー */
const productEntry = async (productSetting: ProductSetting) => {

  // 基準時刻を作る。
  const nowTimestamp = Date.now();
  const std = Math.floor(nowTimestamp / (60 * 1000)) * 60 * 1000;

  /** ■■ 入力フェーズ ■■ */
  let executions: Execution[] = []; // 「基準時刻の1分前」以降の約定履歴の一覧
  let shortAggregatedExecutions: ExecutionAggregated[] = []; // 10秒間隔で集計した集計約定のリスト
  let longAggregatedExecutions: ExecutionAggregated[] = []; // 1時間間隔で集計した集計約定のリスト
  let orders: Order[] = []; // DynamoDB上でACTIVEまたはUNKNOWNとなっている注文のリスト
  let balanceReal: Balance | undefined = undefined; // 日本円の資産残高
  let balanceVirtual: Balance | undefined = undefined; // 仮想通貨の資産残高

  await asyncExecution(
    async () => { executions = await getExecutions(productSetting.productCode, std) },
    async () => { shortAggregatedExecutions = await getShortAggregatedExecutions(productSetting.productCode, std) },
    async () => { longAggregatedExecutions = await getLongAggregatedExecutions(productSetting.productCode, std) },
    async () => { orders = await getOrders(productSetting.productCode) },
    async () => {
      const obj = await getBalances(productSetting.currencyCode.real, productSetting.currencyCode.virtual);
      balanceReal = obj.balanceReal;
      balanceVirtual = obj.balanceVirtual;
    });

  /** 入力フェーズの確認 */
  if(!balanceReal || !balanceVirtual){
    await handleError(__filename, 'productEntry', 'code', '資産情報を取得できませんでした。', { productSetting, });
  }

  /** 処理フェーズ */


};
