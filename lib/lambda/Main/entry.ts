import { appLogger } from "../Common/log";
import { asyncExecution } from "../Common/util";
import handleError from "../HandleError/handleError";
import { setExecution } from "../Interfaces/AWS/Dynamodb/execution";
import { setLongExecution } from "../Interfaces/AWS/Dynamodb/longExecution";
import { deleteOrder, setOrder } from "../Interfaces/AWS/Dynamodb/order";
import { Balance, Execution, ExecutionAggregated, Order, OrderState } from "../Interfaces/DomainType";
import { importProductContextFromDb, saveProductContext } from "./context";
import { execute } from "./ExecutePhase/execute";
import { getBalances } from "./InputPhase/getBalances";
import { getExecutions } from "./InputPhase/getExecutions";
import { getLongAggregatedExecutions } from "./InputPhase/getLongAggregatedExecutions";
import { getOrders } from "./InputPhase/getOrders";
import { getShortAggregatedExecutions } from "./InputPhase/getShortAggregatedExecutions";
import { ProductId, ProductSetting, productSettings } from "./productSettings";
import { StandardTime } from "./StandardTime";

export const entry = async () => {

  await importProductContextFromDb();

  const promiseList: Promise<any>[] = [];
  for (let productSetting of productSettings) {
    promiseList.push(productEntry(productSetting));
  }
  await Promise.all(promiseList);

  await saveProductContext();
  return '';

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
    async () => { executions = await getExecutions(productSetting, std.getStd()) },
    async () => { shortAggregatedExecutions = await getShortAggregatedExecutions(productSetting.id, std.getStd()) },
    async () => { longAggregatedExecutions = await getLongAggregatedExecutions(productSetting.id, std.getStd()) },
    async () => { orders = await getOrders(productSetting) },
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

  // 1分間の分だけ抽出
  const newAggregatedExecutions1Min = newAggregatedExecutions.slice(0, 6);
  appLogger.info(`▼▼▼entry log▼▼▼
${JSON.stringify({ productCode, newAggregatedExecutions, updatedOrder, newLongAggregatedExecution, executions, shortAggregatedExecutions, longAggregatedExecutions, orders, balanceReal, balanceVirtual, })}`);

  /** ■■ 保存フェーズ ■■ */
  await asyncExecution(
    async () => { await setExecution(productSetting.id, std.getStdBefore1Min().toString(), newAggregatedExecutions1Min); },
    async () => { if (newLongAggregatedExecution) { await setLongExecution(productSetting.id, std.getHourStdBefore1Hour().toString(), newLongAggregatedExecution) } },
    ...(updatedOrder.map((orderInfo) => (async () => { await saveOrder(productSetting.id, orderInfo.order, orderInfo.beforeState) }))),
  );

};

const saveOrder = async (productId: ProductId, order: Order, beforeState?: OrderState) => {

  if (beforeState && order.state !== beforeState) {
    // 前のステートのオーダーを削除する。
    await deleteOrder(productId, beforeState, order.acceptanceId, order.orderDate);
  }
  await setOrder(productId, order);

};
