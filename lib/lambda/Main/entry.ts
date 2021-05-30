import { asyncExecution } from "../Common/util";
import handleError from "../HandleError/handleError";
import { setExecution } from "../Interfaces/AWS/Dynamodb/execution";
import { setLongExecution } from "../Interfaces/AWS/Dynamodb/longExecution";
import { deleteOrder, setOrder } from "../Interfaces/AWS/Dynamodb/order";
import { Balance, Execution, ExecutionAggregated, Order, OrderState } from "../Interfaces/DomainType";
import { importProductContextFromDb, saveProductContext } from "./context";
import { execute } from "./ExecutePhase/execute";
import saveExecutionHistory from "./ExecutionHistory/saveExecutionHistory";
import { getBalances } from "./InputPhase/getBalances";
import { getExecutions } from "./InputPhase/getExecutions";
import { getLongAggregatedExecutions } from "./InputPhase/getLongAggregatedExecutions";
import { getOrders } from "./InputPhase/getOrders";
import { getShortAggregatedExecutions } from "./InputPhase/getShortAggregatedExecutions";
import { ProductSetting, productSettings } from "./productSettings";
import { StandardTime } from "./StandardTime";

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

  const productCode = productSetting.productCode;

  // 基準時刻を作る。
  const std = new StandardTime(Date.now());

  /** ■■ 入力フェーズ ■■ */
  let executions: Execution[] = []; // 「基準時刻の1分前」以降の約定履歴の一覧
  let shortAggregatedExecutions: ExecutionAggregated[] = []; // 10秒間隔で集計した集計約定のリスト
  let longAggregatedExecutions: ExecutionAggregated[] = []; // 1時間間隔で集計した集計約定のリスト
  let orders: { order: Order, beforeState: OrderState }[] = []; // DynamoDB上でACTIVEまたはUNKNOWNとなっている注文のリスト
  let balanceReal: Balance | undefined = undefined; // 日本円の資産残高
  let balanceVirtual: Balance | undefined = undefined; // 仮想通貨の資産残高

  await asyncExecution(
    async () => { executions = await getExecutions(productSetting.productCode, std.getStd()) },
    async () => { shortAggregatedExecutions = await getShortAggregatedExecutions(productSetting.productCode, std.getStd()) },
    async () => { longAggregatedExecutions = await getLongAggregatedExecutions(productSetting.productCode, std.getStd()) },
    async () => { orders = await getOrders(productSetting.productCode) },
    async () => {
      const obj = await getBalances(productSetting.currencyCode.real, productSetting.currencyCode.virtual);
      balanceReal = obj.balanceReal;
      balanceVirtual = obj.balanceVirtual;
    });

  /** 入力フェーズの確認 */
  if (!balanceReal || !balanceVirtual) {
    await handleError(__filename, 'productEntry', 'code', '資産情報を取得できませんでした。', { productSetting, });
    return;
  }

  /** ■■ 処理フェーズ ■■ */
  const { newAggregatedExecutions, updatedOrder, newLongAggregatedExecution } = await execute({ executions, shortAggregatedExecutions, longAggregatedExecutions, orders, balanceReal, balanceVirtual, productSetting, std, });

  /** ■■ 保存フェーズ ■■ */
  await asyncExecution(
    async () => { await setExecution(productCode, std.getStdBefore1Min().toString(), newAggregatedExecutions); },
    ...(updatedOrder.map((orderInfo) => (async () => { await saveOrder(productCode, orderInfo.order, orderInfo.beforeState) }))),
    async () => { if (newLongAggregatedExecution) { await setLongExecution(productCode, std.getHourStdBefore1Hour().toString(), newLongAggregatedExecution) } },
  )

};

const saveOrder = async (productCode: string, order: Order, beforeState: OrderState) => {

  if (order.state !== beforeState) {
    // 前のステートのオーダーを削除する。
    await deleteOrder(productCode, beforeState, order.acceptanceId, order.orderDate);
  }
  await setOrder(productCode, order);

};
