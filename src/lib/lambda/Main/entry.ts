import { appLogger } from "../Common/log";
import { asyncExecution, getNowTimestamp } from "../Common/util";
import handleError from "../HandleError/handleError";
import { deleteDynamoDb, putDynamoDb } from "../Interfaces/AWS/Dynamodb/db";
import { dbSettingExecution, dbSettingLongExecution, dbSettingOrder, getOrderSortKey } from "../Interfaces/AWS/Dynamodb/dbSettings";
import { Balance, Execution, ExecutionAggregated, SimpleOrder, OrderState } from "../Interfaces/DomainType";
import { getApiStatus } from "../Interfaces/ExchangeApi/apiStatus";
import { getProductContext, importProductContextFromDb, saveProductContext } from "./context";
import { execute } from "./ExecutePhase/execute";
import { getBalances } from "./InputPhase/getBalances";
import { getExecutions } from "./InputPhase/getExecutions";
import { getLongAggregatedExecutions } from "./InputPhase/getLongAggregatedExecutions";
import { getOrders } from "./InputPhase/getOrders";
import { getShortAggregatedExecutions } from "./InputPhase/getShortAggregatedExecutions";
import { LambdaExecutionChecker } from "./VcatDiContainer/LambdaExecutionChecker";
import { getProductSettings, ProductSetting } from "./productSettings";
import { StandardTime } from "./VcatDiContainer/StandardTime";
import { saveVcatDiContainer, setupVcatDiContainer } from "./VcatDiContainer/vcatDiContainer";

export const entry = async () => {

  await importProductContextFromDb();

  const promiseList: Promise<any>[] = [];
  for (let productSetting of getProductSettings()) {
    promiseList.push(productEntry(productSetting));
  }
  await Promise.all(promiseList);

  await saveProductContext();
  return '';

};

/** プロダクトごとのエントリー */
const productEntry = async (productSetting: ProductSetting) => {

  const diContainer = setupVcatDiContainer(productSetting)
  const productContext = await getProductContext(productSetting.id);

  appLogger.info1(`〇${productSetting.id}-EntryStart-${JSON.stringify({ std: diContainer.standardTime.getStd(), productContext, })}`);

  /** ■■ APIステータス確認 ■■ */
  const apiStatus = await getApiStatus(productSetting);
  if (!apiStatus) {
    appLogger.info1('APIステータス：利用不可');
    return;
  }

  /** ■■ 入力フェーズ ■■ */
  appLogger.info3(`〇〇${productSetting.id}-PhaseInput-Start`);
  let executions: Execution[] = []; // 「基準時刻の1分前」以降の約定履歴の一覧
  let shortAggregatedExecutions: ExecutionAggregated[] = []; // 10秒間隔で集計した集計約定のリスト
  let longAggregatedExecutions: ExecutionAggregated[] = []; // 1時間間隔で集計した集計約定のリスト
  let orders: { order: SimpleOrder, beforeState: OrderState }[] = []; // DynamoDB上でACTIVEまたはUNKNOWNとなっている注文のリスト
  let balanceReal: Balance | undefined = undefined; // 日本円の資産残高
  let balanceVirtual: Balance | undefined = undefined; // 仮想通貨の資産残高

  await asyncExecution(
    async () => { executions = await getExecutions(productSetting, diContainer.standardTime.getStd()) },
    async () => { shortAggregatedExecutions = await getShortAggregatedExecutions(productSetting, diContainer.standardTime.getStd()) },
    async () => { longAggregatedExecutions = await getLongAggregatedExecutions(productSetting, diContainer.standardTime.getStd()) },
    async () => { orders = await getOrders(productSetting) },
    async () => {
      const obj = await getBalances(productSetting.exchangeCode, productSetting.currencyCode.real, productSetting.currencyCode.virtual);
      balanceReal = obj.balanceReal;
      balanceVirtual = obj.balanceVirtual;
    });

  /** 入力フェーズの確認 */
  if (!balanceReal || !balanceVirtual) {
    await handleError(__filename, 'productEntry', 'code', '資産情報を取得できませんでした。', { productSetting, });
    return;
  }
  appLogger.info3(`〇〇${productSetting.id}-PhaseInput-End-${JSON.stringify({ executions, orders, balanceReal, balanceVirtual, shortAggregatedExecutions, longAggregatedExecutions, })}`);

  /** ■■ 処理フェーズ ■■ */
  appLogger.info3(`〇〇${productSetting.id}-PhaseExec-Start`);
  let newAggregatedExecutions: ExecutionAggregated[] = [];
  let updatedOrder: { order: SimpleOrder; beforeState?: OrderState | undefined; }[] = [];
  let newLongAggregatedExecution: ExecutionAggregated | undefined = undefined;
  if (productContext?.executionSetting?.executePhase) {
    const resultExecutePhase = await execute({ executions, shortAggregatedExecutions, longAggregatedExecutions, orders, balanceReal, balanceVirtual, productSetting, });
    newAggregatedExecutions = resultExecutePhase.newAggregatedExecutions;
    updatedOrder = resultExecutePhase.updatedOrder;
    newLongAggregatedExecution = resultExecutePhase.newLongAggregatedExecution;
  }
  // 1分間の分だけ抽出
  const newAggregatedExecutions1Min = newAggregatedExecutions.slice(0, 6);

  appLogger.info3(`〇〇${productSetting.id}-PhaseExec-End-${JSON.stringify({ newAggregatedExecutions, updatedOrder, newLongAggregatedExecution })}`);

  /** ■■ 保存フェーズ ■■ */
  appLogger.info3(`〇〇${productSetting.id}-PhaseOutput-Start`);
  await asyncExecution(
    async () => { await putDynamoDb(productSetting, dbSettingExecution, newAggregatedExecutions1Min) },
    async () => { if (newLongAggregatedExecution) { await putDynamoDb(productSetting, dbSettingLongExecution, newLongAggregatedExecution) } },
    ...(updatedOrder.map((orderInfo) => (async () => { await saveOrder(productSetting, orderInfo.order, orderInfo.beforeState) }))),
  );
  appLogger.info3(`〇〇${productSetting.id}-PhaseOutput-End`);

  appLogger.info1(`〇${productSetting.id}-EntryEnd-${JSON.stringify({ std: diContainer.standardTime.getStd(), productContext, })}`);

  diContainer.lambdaExecutionChecker.executeLast();
  await saveVcatDiContainer(productSetting);

};

const saveOrder = async (productSetting: ProductSetting, order: SimpleOrder, beforeState?: OrderState) => {
  if (beforeState && order.state !== beforeState) {
    // 前のステートのオーダーを削除する。
    await deleteDynamoDb(productSetting, dbSettingOrder, getOrderSortKey(beforeState, order.id, order.orderDate));
  }
  await putDynamoDb(productSetting, dbSettingOrder, order);
};
