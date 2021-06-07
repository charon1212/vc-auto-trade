import { appLogger } from "../../../Common/log";
import { moveUp } from "../../../Common/util";
import handleError from "../../../HandleError/handleError";
import { VCATProductContext } from "../../../Interfaces/AWS/Dynamodb/context";
import { Balance, ExecutionAggregated, Order, OrderState } from "../../../Interfaces/DomainType";
import { cancelOrder, sendOrder } from "../../../Interfaces/ExchangeApi/order";
import { sendSlackMessage } from "../../../Interfaces/Slack/sendSlackMessage";
import { getProductContext } from "../../context";
import { ProductSetting } from "../../productSettings";

export type Input = {
  shortAggregatedExecutions: ExecutionAggregated[],
  longAggregatedExecutions: ExecutionAggregated[],
  orders: Order[],
  balanceReal: Balance,
  balanceVirtual: Balance,
  productSetting: ProductSetting,
};

/**
 * メインの発注・キャンセル処理。
 * @param input 
 * @returns 
 */
export const main = async (input: Input): Promise<Order[]> => {

  const { shortAggregatedExecutions, longAggregatedExecutions, orders, balanceReal, balanceVirtual, productSetting, } = input;
  const productContext = await getProductContext(productSetting.productCode);

  appLogger.info(JSON.stringify({ input, productContext }));

  if (!productContext) return [];

  /** ■■ 1: 約定状況を確認し、フェーズを更新 ■■ */
  if (productContext.orderPhase === 'BuyOrderWaiting') { // 買い注文を出した後の約定待ち
    judgeOrderSuccess(productContext.orderAcceptanceId!, orders, (order) => {
      // 成功したため、売りタイミング待ちに移行。
      productContext.orderPhase = 'Selling';
      appLogger.info(`★ChangePhase★ BuyOrderWaiting → Selling`);
      productContext.orderAcceptanceId = undefined;
      if (order.parentSortMethod === 'NORMAL' && order.childOrderList[0]?.averagePrice) {
        productContext.buyOrderPrice = order.childOrderList[0].averagePrice;
      } else {
        throw new Error('親注文は未実装です。');
      }
    }, (order) => {
      // 失敗したため、再度買いタイミング待ちに移行。
      productContext.orderPhase = 'Buying';
      productContext.orderAcceptanceId = undefined;
      appLogger.info(`★ChangePhase★ BuyOrderWaiting → Buying`);
    });
  } else if (productContext.orderPhase === 'SellOrderWaiting') { // 売り注文を出した後の約定待ち
    judgeOrderSuccess(productContext.orderAcceptanceId!, orders, (order) => {
      // 成功したため、買いタイミング待ちに移行。
      productContext.orderPhase = 'Buying';
      productContext.orderAcceptanceId = undefined;
      productContext.buyOrderPrice = undefined;
      appLogger.info(`★ChangePhase★ SellOrderWaiting → Buying`);
    }, (order) => {
      // 失敗したため、再度売りタイミング待ちに移行。
      productContext.orderPhase = 'Selling';
      productContext.orderAcceptanceId = undefined;
      appLogger.info(`★ChangePhase★ SellOrderWaiting → Selling`);
    });
  }

  /** ■■2: フェーズごとの処理■■ */
  const newOrders: Order[] = [];
  if (productContext.orderPhase === 'Buying' && canMakeNewOrder(productContext)) {
    // 買いのタイミングの場合、買い注文を入れる。
    const judgeResult = judgeBuyTiming(shortAggregatedExecutions);
    if (judgeResult) appLogger.info('★★★★★BuyTiming★★★★★');
    if (judgeResult) {
      const sizeByUnit = 10; // とりあえず、1XRP買う。
      const buyOrder = await sendOrder(productSetting.productCode, 'MARKET', 'BUY', sizeByUnit);
      if (buyOrder) {
        newOrders.push(buyOrder);
        productContext.orderPhase = 'BuyOrderWaiting';
        productContext.orderAcceptanceId = buyOrder.acceptanceId;
        appLogger.info(`★ChangePhase★ Buying → BuyOrderWaiting`);
        await sendSlackMessage(`PhaseTrans: Buying → BuyOrderWaiting.`, false);
      }
    }
  } else if (productContext.orderPhase === 'Selling') {
    // 買い注文の結果に対応する売り注文を出す。
    const buyPrice = productContext.buyOrderPrice;
    if (buyPrice) {
      const size = Math.floor(balanceVirtual.available / productSetting.orderUnit); // 売れるだけ売る
      const price = moveUp(buyPrice * 1.005, 2, 'floor'); // 一応、少数以下2桁で四捨五入する。
      const sellOrder = await sendOrder(productSetting.productCode, 'LIMIT', 'SELL', size, price);
      if (sellOrder) {
        newOrders.push(sellOrder);
        productContext.orderPhase = 'SellOrderWaiting';
        productContext.orderAcceptanceId = sellOrder.acceptanceId;
        appLogger.info(`★ChangePhase★ Selling → SellOrderWaiting`);
        await sendSlackMessage(`PhaseTrans: Selling → SellOrderWaiting. ${JSON.stringify({ buyPrice, sellPrice: price })}`, false);
      }
    }
  } else if (productContext.orderPhase === 'SellOrderWaiting') {
    // 損切りの判断をする。
    // 直近の約定価格を取得
    const latestExecutionAggregated = getLatestExecution(shortAggregatedExecutions);
    if (latestExecutionAggregated && productContext.buyOrderPrice) {
      // 直近の約定価格が、買った時の値段の3%を下回っていたら、成行で売って損切に。
      if (latestExecutionAggregated.price < productContext.buyOrderPrice * 0.97) {
        await cancelOrder(productSetting.productCode, undefined, productContext.orderAcceptanceId);
        const size = Math.floor(balanceVirtual.available / productSetting.orderUnit); // 売れるだけ売る
        const sellOrder = await sendOrder(productSetting.productCode, 'MARKET', 'SELL', size,);
        if (sellOrder) {
          newOrders.push(sellOrder);
          productContext.orderPhase = 'StopLoss';
          appLogger.info(`★ChangePhase★ SellOrderWaiting → StopLoss`);
          productContext.stopLossTimestamp = Date.now();
        }
      }
    }
  } else if (productContext.orderPhase === 'StopLoss') {
    // 一定時間が経過していたら戻す。とりあえず1時間。
    const stopLossTime = productContext.stopLossTimestamp;
    const oneHourByMilliseconds = 60 * 60 * 1000;
    if (stopLossTime && Date.now() > stopLossTime + oneHourByMilliseconds) {
      productContext.orderPhase = 'Buying'; // 1時間待ったら買い待ちに戻る。
      appLogger.info(`★ChangePhase★ StopLoss → Buying`);
      productContext.stopLossTimestamp = undefined;
    }
  }

  return newOrders;

};

const canMakeNewOrder = (context: VCATProductContext) => {
  // Contextの指定で新規注文の許可が出ていない場合
  if (!context.makeNewOrder) return false;
  // 現在時刻が22:00～6:59の場合 (UTCで13時 <= t < 22時)の場合
  const nowHour = (new Date()).getUTCHours();
  if(nowHour >= 13 && nowHour < 22) return false;
  return true;
};

/**
 * 注文一覧の中から指定した受付IDの注文を見つける。
 * その注文が、COMPLETEDなら、onSuccessを実行する。
 * その注文が、CANCELED, EXPIRED, REJECTEDなら、onFailを実行する。
 * @param acceptanceId 対象注文の受付ID
 * @param orderList 入力フェーズで取得した注文のリスト
 * @param onSuccess 完了した時の注文に対する処理
 * @param onFail 失敗(キャンセル、期限切れ、Rejected)した時の注文に対する処理
 */
const judgeOrderSuccess = async (acceptanceId: string, orderList: Order[], onSuccess: (order: Order) => void, onFail: (order: Order) => void) => {

  const targetOrder = orderList.find((order) => (order.acceptanceId === acceptanceId));
  if (!targetOrder) {
    await handleError(__filename, 'judgeOrderSuccess', 'code', '注文待機中に、対象の注文が見つかりませんでした。', { acceptanceId, orderList, });
    return;
  }
  appLogger.info(`★JudgeOrderSuccess★${JSON.stringify({ targetOrder, acceptanceId })}`);
  const failedStateList: OrderState[] = ['CANCELED', 'EXPIRED', 'REJECTED'];
  if (failedStateList.includes(targetOrder.state)) {// 注文に失敗した場合
    appLogger.info(`★JudgeOrderSuccess★  Fail`);
    onFail(targetOrder);
  } else if (targetOrder.state === 'COMPLETED') { // 注文に成功した場合
    appLogger.info(`★JudgeOrderSuccess★  Success`);
    onSuccess(targetOrder);
  }

};

/**
 * 価格履歴を作成する。
 * @param list timestampの昇順で登録すること。ただし、穴抜けはあってもよい。自動的に補間する。
 * @param interval listに登録したtimestampの間隔。
 * @returns 価格履歴。最新のものほどindexが小さい配列とする。穴抜け(価格が0やそもそもデータがない部分)はその前の価格で埋める。ただし、最も過去のデータが穴抜けの場合は、その直後の価格で埋める。全てpriceが0の場合は、空配列を返却する。
 */
const makePriceHistory = (list: ExecutionAggregated[], interval: number) => {

  if (list.length === 0) return [];

  let firstPrice = 0; // 最初の価格を取得する。
  for (let execution of list) {
    if (execution.price) {
      firstPrice = execution.price;
      break;
    }
  }

  if (firstPrice === 0) return []; // 価格情報が一個もない場合

  const priceHistory: number[] = [];
  const start = list[0].timestamp;
  const end = list[list.length - 1].timestamp;
  let index = 0;
  let beforePrice = firstPrice;
  for (let time = start; time <= end; time += interval) {
    if (index < list.length && list[index].timestamp === time) { // 通常通りデータが見つかった場合
      priceHistory.push(list[index].price || beforePrice);
      beforePrice = list[index].price || beforePrice;
    } else { // データが欠落している場合
      priceHistory.push(beforePrice);
    }
    // indexが今のtimeを超えるまで増加させる。
    while (index < list.length && list[index].timestamp <= time) index++;
  }

  return priceHistory.reverse();

};

/**
 * 買いタイミングかどうか判定する。
 * @param shortAggregatedExecutions 短期集計約定リスト。10秒間隔で今今は2時間分取得できる。
 * @returns 買いのタイミングならtrue、そうでなければfalse。
 */
const judgeBuyTiming = (shortAggregatedExecutions: ExecutionAggregated[],) => {

  appLogger.info(`△△△JudgeBuyTiming△△△${JSON.stringify({ shortAggregatedExecutions })}`);
  if (shortAggregatedExecutions.length === 0) return false;
  const priceHistory = makePriceHistory(shortAggregatedExecutions, 10 * 1000);
  const priceNow = priceHistory[0];
  // 10点の移動平均線
  const moveAverage10 = makeMoveAverage(priceHistory, 10);
  // 100点の移動平均線
  const moveAverage40 = makeMoveAverage(priceHistory, 40);
  // 2時間のデータの平均を取得
  const totalAverage = getAverage(priceHistory);
  // 現在価格と平均価格の比
  const relativeIndexRate = (priceNow - totalAverage) / priceNow;

  appLogger.info(JSON.stringify({
    priceHistory, totalAverage, relativeIndexRate,
    shortMoveAve: moveAverage10.slice(0, 40),
    longMoveAve: moveAverage40.slice(0, 40),
  }));
  let moveAveLogStr = '';
  for (let i = 0; i < 40; i++) moveAveLogStr += (moveAverage10[i] <= moveAverage40[i]) ? 'ー' : '＋';
  appLogger.info(`◇◇◇index: ${relativeIndexRate}◇◇◇
${moveAveLogStr}`);

  // 2時間平均よりも0.25%～1.5%下に位置しない
  if (relativeIndexRate < -0.015 || relativeIndexRate > -0.0025) return false;
  // 直近6点に対し、短期移動平均線が長期移動平均線を下回る場合は買わない。
  for (let i = 0; i < 6; i++) if (moveAverage10[i] <= moveAverage40[i]) return false;
  // 直近40点に対し、長期移動平均線が短期移動平均線を上回る点が10点以上ある。
  let countShortAboveLongBelow = 0;
  for (let i = 0; i < 40; i++) if (moveAverage10[i] < moveAverage40[i]) countShortAboveLongBelow++;
  if (countShortAboveLongBelow >= 10) return true;
  return false;

};

/**
 * 移動平均を取得する
 * @param list 数値のリスト
 * @param interval 平均化間隔
 */
const makeMoveAverage = (list: number[], interval: number) => {

  const moveAverage: number[] = [];
  for (let i = 0; i < list.length - interval; i++) {
    let sum = 0
    for (let j = 0; j < interval; j++) sum += list[i + j];
    moveAverage.push(sum / interval);
  }
  return moveAverage;

};

const getAverage = (list: number[]) => {
  if (list.length === 0) return 0;
  let sum = 0;
  for (let value of list) sum += value;
  return sum / list.length;
}

/**
 * 直近の実績がある集計約定を取得する。
 * @param shortAggregatedExecutions 集計約定のリスト。Indexが小さいほど過去のデータになるように並べる。
 * @returns 直近の実績がある集計約定。
 */
const getLatestExecution = (shortAggregatedExecutions: ExecutionAggregated[]) => {
  // 後ろから調べていって、Priceが0以外となった集計約定を返却する。
  for (let index = shortAggregatedExecutions.length - 1; index >= 0; index--) {
    if (shortAggregatedExecutions[index].price) return shortAggregatedExecutions[index];
  }
  return undefined;
};
