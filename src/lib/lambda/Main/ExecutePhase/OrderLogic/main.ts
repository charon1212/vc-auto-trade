import { appLogger } from "../../../Common/log";
import { getNowDate, getNowTimestamp, moveUp } from "../../../Common/util";
import handleError from "../../../HandleError/handleError";
import { Balance, ExecutionAggregated, SimpleOrder, VCATProductContext } from "../../../Interfaces/DomainType";
import { cancelOrder, sendOrder } from "../../../Interfaces/ExchangeApi/order";
import { getProductContext } from "../../context";
import { ProductSetting } from "../../productSettings";
import { getVcatDiContainer } from "../../VcatDiContainer/vcatDiContainer";
import { judgeBuyTiming } from "./buyJudge";
import { getLatestExecution } from "./judgeUtil";
import { OrderStateController } from "./orderStateController";

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

  const diContainer = await getVcatDiContainer(productSetting.id);
  const productContext = await getProductContext(productSetting.id);
  if (!productContext) {
    await handleError(__filename, 'main', 'code', 'コンテキストが見つかりませんでした。', { productSetting });
    return [];
  }
  const targetOrder = orders.find((order) => (order.id === productContext.orderId));
  if (productContext.afterSendOrder && !targetOrder) {
    await handleError(__filename, 'main', 'code', '発注中の注文情報が見つかりませんでした。', { productContext, orders });
    return [];
  }
  const orderStateController = new OrderStateController(productSetting, productContext);

  appLogger.info1(`〇〇〇${productSetting.id}-StartMain-${JSON.stringify({ productContext, targetOrder, })}`);

  /** ■■ 発注後の場合、注文の状態を確認して状態遷移する ■■ */
  if (productContext.afterSendOrder && targetOrder) {
    if (targetOrder.state === 'COMPLETED') {// 注文に成功した場合
      const timestamp = getNowTimestamp();
      const price = targetOrder.main.averagePrice!;
      const amount = targetOrder.main.size;
      const buyInfo = productContext.buyOrderInfo;
      if (!price) {
        await handleError(__filename, 'main', 'code', '約定した注文の価格が取得できませんでした。');
        return [];
      }
      if (productContext.orderPhase === 'Sell' || productContext.orderPhase === 'StopLoss') {
        if (!buyInfo?.timestamp || !buyInfo?.price || !buyInfo?.amount) {
          await handleError(__filename, 'main', 'code', '購入情報が取得できませんでした。');
        } else {
          diContainer.tradeReportManager.add({
            buy: {
              timestamp: buyInfo.timestamp,
              price: buyInfo.price,
              amount: buyInfo.amount,
            },
            sell: { timestamp, price, amount },
            isStopLoss: productContext.orderPhase === 'StopLoss',
          });
        }
      }
      orderStateController.onOrderSuccess({ timestamp, price, amount });
    } else if (targetOrder.state === 'INVALID') { // 注文に失敗した場合
      orderStateController.onOrderFailed();
    }
  }

  /** ■■ フェーズごとの処理 ■■ */
  const newOrders: SimpleOrder[] = [];
  if (productContext.orderPhase === 'Buy' && !productContext.afterSendOrder && canMakeNewOrder(productContext)) {
    // 買いのタイミングの場合、買い注文を入れる。
    const judgeResult = judgeBuyTiming(productSetting, shortAggregatedExecutions);
    if (judgeResult) {
      await sendBuyOrder(productSetting, async (buyOrder) => { // 買い注文に成功した場合の処理
        orderStateController.onSendOrder(buyOrder);
        newOrders.push(buyOrder);
      }, async () => {
        await handleError(__filename, 'main', 'code', '発注に失敗しました。', { productSetting });
      });
    }
  } else if (productContext.orderPhase === 'Sell' && !productContext.afterSendOrder) {
    // 買い注文の結果に対応する売り注文を出す。
    const buyPrice = productContext.buyOrderPrice;
    if (buyPrice) {
      await sendSellOrder(productSetting, balanceVirtual.available, buyPrice, async (sellOrder) => { // 売り注文に成功した場合の処理
        orderStateController.onSendOrder(sellOrder);
        newOrders.push(sellOrder);
      }, async () => {
        await handleError(__filename, 'main', 'code', '発注に失敗しました。', { productSetting, availableBalanceVirtual: balanceVirtual.available, buyPrice, });
      });
    }
  } else if (productContext.orderPhase === 'Sell' && productContext.afterSendOrder) {
    // 損切りの判断をする。
    // 直近の約定価格が、買った時の値段の3%を下回っていたら、成行で売って損切に。
    if (await judgeStopLoss(productSetting, productContext, shortAggregatedExecutions)) {
      const cancelResult = targetOrder && await cancelOrder(productSetting, targetOrder);
      const size = (targetOrder?.main.size || 0) / productSetting.orderUnit;
      if (cancelResult) {
        if (targetOrder) targetOrder.state = 'INVALID';
        await sendStopLossOrder(productSetting, size, async (sellOrder) => { // 損切注文を発注できた場合
          newOrders.push(sellOrder);
          orderStateController.onStopLoss(sellOrder, 60 * 60 * 1000);
        }, async () => {
          await orderStateController.onFailSendStopLossOrder();
          await handleError(__filename, 'main', 'code', '損切注文の発注に失敗しました。', { productSetting, size, });
        });
      }
    }
  } else if (productContext.orderPhase === 'Wait') {
    // 再開時間に到達した場合、買い状態に遷移する。
    const startBuyTimestamp = productContext.startBuyTimestamp;
    if (startBuyTimestamp && getNowTimestamp() > startBuyTimestamp) {
      orderStateController.onStartBuy();
    }
  }

  // 死活チェッカーに実行したことを知らせる。
  diContainer.lambdaExecutionChecker.executeMain();
  return newOrders;

};

/**
 * 実際に買い注文を送信し、成功した場合はその結果を配列で返却する。失敗した場合は空配列を返却する。
 */
const sendBuyOrder = async (productSetting: ProductSetting, onSuccess: (order: SimpleOrder) => void | Promise<void>, onFailure: () => void | Promise<void>) => {
  const sizeByUnit = 5;
  const buyOrder = await sendOrder(productSetting, 'MARKET', 'BUY', sizeByUnit);
  buyOrder ? (await onSuccess(buyOrder)) : (await onFailure());
};

/**
 * 実際に売り注文を送信し、成功した場合はその結果を配列で返却する。失敗した場合は空配列を返却する。
 */
const sendSellOrder = async (productSetting: ProductSetting, availableBalanceVirtual: number, buyPrice: number, onSuccess: (order: SimpleOrder) => void | Promise<void>, onFailure: () => void | Promise<void>) => {
  const size = Math.floor(availableBalanceVirtual / productSetting.orderUnit); // 売れるだけ売る
  const price = moveUp(buyPrice * 1.005, 0, 'floor'); // 整数に四捨五入する。
  const sellOrder = await sendOrder(productSetting, 'LIMIT', 'SELL', size, price);
  sellOrder ? (await onSuccess(sellOrder)) : (await onFailure());
};

const sendStopLossOrder = async (productSetting: ProductSetting, size: number, onSuccess: (order: SimpleOrder) => void | Promise<void>, onFailure: () => void | Promise<void>) => {
  const sellOrder = await sendOrder(productSetting, 'MARKET', 'SELL', size,);
  sellOrder ? (await onSuccess(sellOrder)) : (await onFailure());
};

const canMakeNewOrder = (context: VCATProductContext) => {
  // Contextの指定で新規注文の許可が出ていない場合
  if (!context.executionSetting?.makeNewOrder) return false;
  // 現在時刻が22:00～6:59の場合 (UTCで13時 <= t < 22時)の場合
  const nowHour = (getNowDate()).getUTCHours();
  if (nowHour >= 13 && nowHour < 22) return false;
  return true;
};

const judgeStopLoss = async (productSetting: ProductSetting, context: VCATProductContext, shortAggregatedExecutions: ExecutionAggregated[],) => {
  const latestExecutionAggregated = getLatestExecution(shortAggregatedExecutions);
  if (!latestExecutionAggregated) {
    await handleError(__filename, 'judgeStopLoss', 'code', '直近の集計約定を取得できません。', { productSetting, context, });
    return false;
  }
  if (!context.buyOrderPrice) {
    await handleError(__filename, 'judgeStopLoss', 'code', '購入価格を見失いました。', { productSetting, context, });
    return false;
  }
  const result = latestExecutionAggregated.price < context.buyOrderPrice * (1 - 0.005);
  appLogger.info1(`〇〇〇${productSetting.id}-Judge-StopLoss-${JSON.stringify({ result, latestExecutionAggregated, context, })}`);
  return result;
};
