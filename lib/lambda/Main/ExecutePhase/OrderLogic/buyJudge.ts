import { appLogger } from "../../../Common/log";
import { ExecutionAggregated } from "../../../Interfaces/DomainType";
import { ProductSetting } from "../../productSettings";
import { getAverage, makeMoveAverage, makePriceHistory } from "./judgeUtil";

/**
 * 買いタイミングかどうか判定する。
 * @param shortAggregatedExecutions 短期集計約定リスト。10秒間隔で今今は2時間分取得できる。
 * @returns 買いのタイミングならtrue、そうでなければfalse。
 */
export const judgeBuyTiming = (productSetting: ProductSetting, shortAggregatedExecutions: ExecutionAggregated[],) => {

  // 2時間 = 2*60*6 × (10秒) = 720 × (10秒)なので、720点のデータが期待できる。この9割はそろっていること。
  if (shortAggregatedExecutions.length < 720 * 0.9) return false;
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

  if (moveAverage10.length < 40) return false;
  if (moveAverage40.length < 40) return false;

  let moveAveLogStr = '';
  for (let i = 0; i < 40; i++) moveAveLogStr += (moveAverage10[i] <= moveAverage40[i]) ? 'ー' : '＋';
  let latestShortIsAboveLong = true;
  for (let i = 0; i < 6; i++) if (moveAverage10[i] <= moveAverage40[i]) latestShortIsAboveLong = false;
  let countShortAboveLongBelow = 0;
  for (let i = 0; i < 40; i++) if (moveAverage10[i] < moveAverage40[i]) countShortAboveLongBelow++;

  /**
   * 買い条件は、次の3条件をすべて満たすこと。
   *   ①最近接取引価格が、2時間平均の98.5%～99.75%に位置する。
   *   ②直近6点は、短期移動平均線が長期移動平均線を上回る。(ゴールデンクロス→デッドロックの間)
   *   ③直近40点に対し、長期移動平均線が短期移動平均線を10点以上上回る。
   */
  let judgeResult: boolean;
  let reasonStr = '';
  if (relativeIndexRate < -0.015 || relativeIndexRate > -0.0025) { // ①
    judgeResult = false;
    reasonStr = '①';
  } else if (!latestShortIsAboveLong) { // ②
    judgeResult = false;
    reasonStr = '②';
  } else if (countShortAboveLongBelow < 10) { // ③
    judgeResult = false;
    reasonStr = '③';
  } else {
    judgeResult = true;
  }

  appLogger.info(`〇〇〇${productSetting.id}-Judge-Buy-${JSON.stringify({ judgeResult, reasonStr, relativeIndexRate, moveAveLogStr, })}`);

  return judgeResult;

};
