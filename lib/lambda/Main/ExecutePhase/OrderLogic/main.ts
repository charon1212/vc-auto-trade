import { appLogger } from "../../../Common/log";
import { moveUp } from "../../../Common/util";
import handleError from "../../../HandleError/handleError";
import { OrderPhase, VCATProductContext } from "../../../Interfaces/AWS/Dynamodb/context";
import { Balance, ExecutionAggregated, OrderState, SimpleOrder } from "../../../Interfaces/DomainType";
import { cancelOrder, sendOrder } from "../../../Interfaces/ExchangeApi/order";
import { sendSlackMessage } from "../../../Interfaces/Slack/sendSlackMessage";
import { getProductContext } from "../../context";
import { ProductSetting } from "../../productSettings";
import { judgeBuyTiming } from "./buyJudge";
import { getLatestExecution } from "./judgeUtil";

export type Input = {
  shortAggregatedExecutions: ExecutionAggregated[],
  longAggregatedExecutions: ExecutionAggregated[],
  orders: SimpleOrder[],
  balanceReal: Balance,
  balanceVirtual: Balance,
  productSetting: ProductSetting,
};

/**
 * メインの発注・キャンセル処理。
 */
export const main = async (input: Input): Promise<SimpleOrder[]> => {

  const { shortAggregatedExecutions, longAggregatedExecutions, orders, balanceReal, balanceVirtual, productSetting, } = input;
  const productContext = await getProductContext(productSetting.id);

  if (!productContext) return [];

  /** ■■ 発注後の場合、注文の状態を確認して状態遷移する ■■ */
  if (productContext.afterSendOrder) {
    await judgeOrderSuccess(productSetting, productContext.orderId!, orders,
      async (order) => { // 成功したため、次のフェーズに遷移
        const beforeOrderPhase = productContext.orderPhase;
        const afterOrderPhase = getNextOrderPhase(beforeOrderPhase);
        productContext.orderId = undefined;
        if (beforeOrderPhase === 'Buy') {
          productContext.buyOrderPrice = order.main.averagePrice;
        } else {
          productContext.buyOrderPrice = undefined;
        }
        productContext.orderPhase = afterOrderPhase;
        productContext.afterSendOrder = false;
        appLogger.info(`〇〇〇${productSetting.id}-ChangePhase-${beforeOrderPhase}→${afterOrderPhase}`);
        await sendSlackMessage(`★Phase: ${beforeOrderPhase} => ${afterOrderPhase}`, false);
      }, async (order) => { // 失敗したため、再度発注状態に戻る
        productContext.afterSendOrder = false;
        productContext.orderId = undefined;
      });
  }

  /** ■■ フェーズごとの処理 ■■ */
  const newOrders: SimpleOrder[] = [];
  if (productContext.orderPhase === 'Buy' && !productContext.afterSendOrder && canMakeNewOrder(productContext)) {
    // 買いのタイミングの場合、買い注文を入れる。
    const judgeResult = judgeBuyTiming(productSetting, shortAggregatedExecutions);
    if (judgeResult) {
      await sendBuyOrder(productSetting, async (buyOrder) => { // 買い注文に成功した場合の処理
        productContext.afterSendOrder = true;
        productContext.orderId = buyOrder.id;
        await sendSlackMessage(`★Send buy order.`, false);
        newOrders.push(buyOrder);
      });
    }
  } else if (productContext.orderPhase === 'Sell' && !productContext.afterSendOrder) {
    // 買い注文の結果に対応する売り注文を出す。
    const buyPrice = productContext.buyOrderPrice;
    if (buyPrice) {
      await sendSellOrder(productSetting, balanceVirtual.available, buyPrice, async (sellOrder) => { // 売り注文に成功した場合の処理
        productContext.afterSendOrder = true;
        productContext.orderId = sellOrder.id;
        await sendSlackMessage(`★Send sell order. ${JSON.stringify({ buyPrice, sellPrice: sellOrder.main.price })}`, false);
        newOrders.push(sellOrder);
      });
    }
  } else if (productContext.orderPhase === 'Sell' && productContext.afterSendOrder) {
    // 損切りの判断をする。
    // 直近の約定価格が、買った時の値段の3%を下回っていたら、成行で売って損切に。
    if (judgeStopLoss(productSetting, productContext, shortAggregatedExecutions)) {
      const targetOrder = orders.find((order) => { order.id === productContext.orderId });
      const cancelResult = targetOrder && await cancelOrder(productSetting, targetOrder);
      if (cancelResult) await sendStopLossOrder(productSetting, balanceVirtual.available, async (sellOrder) => { // 損切注文を発注できた場合
        newOrders.push(sellOrder);
        productContext.orderPhase = 'StopLoss';
        appLogger.info(`〇〇〇${productSetting.id}-ChangePhase-Sell→StopLoss`);
        productContext.afterSendOrder = true;
        productContext.orderId = sellOrder.id;
        productContext.startBuyTimestamp = Date.now() + 60 * 60 * 1000; // 1時間後にする。
      });
    }
  } else if (productContext.orderPhase === 'Wait') {
    // 再開時間に到達した場合、買い状態に遷移する。
    const startBuyTimestamp = productContext.startBuyTimestamp;
    if (startBuyTimestamp && Date.now() > startBuyTimestamp) {
      productContext.orderPhase = 'Buy';
      appLogger.info(`〇〇〇${productSetting.id}-ChangePhase-Wait→Buy`);
      productContext.startBuyTimestamp = undefined;
    }
  }

  return newOrders;

};

/**
 * 実際に買い注文を送信し、成功した場合はその結果を配列で返却する。失敗した場合は空配列を返却する。
 */
const sendBuyOrder = async (productSetting: ProductSetting, onSuccess: (order: SimpleOrder) => void | Promise<void>) => {
  const sizeByUnit = 5;
  const buyOrder = await sendOrder(productSetting, 'MARKET', 'BUY', sizeByUnit);
  if (buyOrder) await onSuccess(buyOrder);
};

/**
 * 実際に売り注文を送信し、成功した場合はその結果を配列で返却する。失敗した場合は空配列を返却する。
 */
const sendSellOrder = async (productSetting: ProductSetting, availableBalanceVirtual: number, buyPrice: number, onSuccess: (order: SimpleOrder) => void | Promise<void>) => {
  const size = Math.floor(availableBalanceVirtual / productSetting.orderUnit); // 売れるだけ売る
  const price = moveUp(buyPrice * 1.005, 0, 'floor'); // 整数に四捨五入する。
  const sellOrder = await sendOrder(productSetting, 'LIMIT', 'SELL', size, price);
  if (sellOrder) await onSuccess(sellOrder);
};

const sendStopLossOrder = async (productSetting: ProductSetting, availableBalanceVirtual: number, onSuccess: (order: SimpleOrder) => void | Promise<void>) => {
  const size = Math.floor(availableBalanceVirtual / productSetting.orderUnit); // 売れるだけ売る
  const sellOrder = await sendOrder(productSetting, 'MARKET', 'SELL', size,);
  if (sellOrder) await onSuccess(sellOrder);
};

const canMakeNewOrder = (context: VCATProductContext) => {
  // Contextの指定で新規注文の許可が出ていない場合
  if (!context.makeNewOrder) return false;
  // 現在時刻が22:00～6:59の場合 (UTCで13時 <= t < 22時)の場合
  const nowHour = (new Date()).getUTCHours();
  if (nowHour >= 13 && nowHour < 22) return false;
  return true;
};

const getNextOrderPhase = (phase?: OrderPhase): OrderPhase | undefined => {
  if (phase === 'Buy') return 'Sell';
  if (phase === 'Sell') return 'Buy';
  if (phase === 'StopLoss') return 'Wait';
  if (phase === 'Wait') return 'Buy';
  return undefined;
}

/**
 * 注文一覧の中から指定した受付IDの注文を見つける。
 * その注文が、COMPLETEDなら、onSuccessを実行する。
 * その注文が、CANCELED, EXPIRED, REJECTEDなら、onFailを実行する。
 * @param orderId 対象注文の受付ID
 * @param orderList 入力フェーズで取得した注文のリスト
 * @param onSuccess 完了した時の注文に対する処理
 * @param onFail 失敗(キャンセル、期限切れ、Rejected)した時の注文に対する処理
 */
const judgeOrderSuccess = async (productSetting: ProductSetting, orderId: string, orderList: SimpleOrder[], onSuccess: (order: SimpleOrder) => Promise<void>, onFail: (order: SimpleOrder) => Promise<void>) => {

  const targetOrder = orderList.find((order) => (order.id === orderId));
  if (!targetOrder) {
    await handleError(__filename, 'judgeOrderSuccess', 'code', '注文待機中に、対象の注文が見つかりませんでした。', { acceptanceId: orderId, orderList, });
    return;
  }
  appLogger.info(`〇〇〇${productSetting.id}-TargetOrder-${JSON.stringify({ targetOrder })}`);
  if (targetOrder.state === 'INVALID') {// 注文に失敗した場合
    await onFail(targetOrder);
  } else if (targetOrder.state === 'COMPLETED') { // 注文に成功した場合
    await onSuccess(targetOrder);
  }

};

const judgeStopLoss = (productSetting: ProductSetting, context: VCATProductContext, shortAggregatedExecutions: ExecutionAggregated[],) => {

  const latestExecutionAggregated = getLatestExecution(shortAggregatedExecutions);
  const result = Boolean(latestExecutionAggregated && context.buyOrderPrice && latestExecutionAggregated.price < context.buyOrderPrice * 0.97);
  appLogger.info(`〇〇〇${productSetting.id}-Judge-Buy-${JSON.stringify({ latestExecutionAggregated, context, })}`);
  return result

};
