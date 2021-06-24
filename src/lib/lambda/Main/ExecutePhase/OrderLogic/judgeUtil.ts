import { ExecutionAggregated } from "../../../Interfaces/DomainType";

/**
 * 移動平均を取得する
 * @param list 数値のリスト
 * @param interval 平均化間隔
 */
 export const makeMoveAverage = (list: number[], interval: number) => {

  const moveAverage: number[] = [];
  for (let i = 0; i < list.length - interval; i++) {
    let sum = 0
    for (let j = 0; j < interval; j++) sum += list[i + j];
    moveAverage.push(sum / interval);
  }
  return moveAverage;

};

export const getAverage = (list: number[]) => {
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
export const getLatestExecution = (shortAggregatedExecutions: ExecutionAggregated[]) => {
  // 後ろから調べていって、Priceが0以外となった集計約定を返却する。
  for (let index = shortAggregatedExecutions.length - 1; index >= 0; index--) {
    if (shortAggregatedExecutions[index].price) return shortAggregatedExecutions[index];
  }
  return undefined;
};


/**
 * 価格履歴を作成する。
 * @param list timestampの昇順で登録すること。ただし、穴抜けはあってもよい。自動的に補間する。
 * @param interval listに登録したtimestampの間隔。
 * @returns 価格履歴。最新のものほどindexが小さい配列とする。穴抜け(価格が0やそもそもデータがない部分)はその前の価格で埋める。ただし、最も過去のデータが穴抜けの場合は、その直後の価格で埋める。全てpriceが0の場合は、空配列を返却する。
 */
export const makePriceHistory = (list: ExecutionAggregated[], interval: number) => {

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