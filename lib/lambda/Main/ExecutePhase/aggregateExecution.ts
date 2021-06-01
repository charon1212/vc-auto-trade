import handleError from "../../HandleError/handleError";
import { Execution, ExecutionAggregated } from "../../Interfaces/DomainType";
import { StandardTime } from "../StandardTime";

/**
 * 約定履歴の集計を行う。
 */
export const aggregateExecution = async (executions: Execution[], shortAggregatedExecutions: ExecutionAggregated[], longAggregatedExecutions: ExecutionAggregated[], std: StandardTime) => {

  /** 新しい短期集計約定を作成する。 */
  const newShortAggregatedExecutions: ExecutionAggregated[] = [];
  // 新規の短期集計約定をいくつ集計するか計算する。現在～基準時刻の1分前を10秒間隔で切り捨てる。
  const Minute10ByMilliseconds = 10 * 1000;
  const max = Math.floor((std.getNow() - std.getStdBefore1Min()) / (Minute10ByMilliseconds));

  for (let index = 0; index < max; index++) {
    const start = std.getStdBefore1Min() + index * Minute10ByMilliseconds;
    const end = start + Minute10ByMilliseconds;
    const targetExecutions = executions.filter((value) => (value.executionDate.getTime() >= start && value.executionDate.getTime() < end));
    const newAggregatedExecutions = aggregateShort(targetExecutions, start);
    newShortAggregatedExecutions.push(newAggregatedExecutions);
  }

  /** まだ長期集計約定が作られていない場合、長期集計約定を作成する。 */
  let newLongAggregatedExecution: ExecutionAggregated | undefined = undefined;
  const longTimestamp = std.getHourStdBefore1Hour();
  if (longAggregatedExecutions.length === 0 || longAggregatedExecutions[longAggregatedExecutions.length - 1].timestamp !== longTimestamp) {
    const allAggregatedExecutions = [...shortAggregatedExecutions, ...newShortAggregatedExecutions];
    const start = std.getHourStdBefore1Hour();
    const end = std.getHourStd();
    const targetExecutions = allAggregatedExecutions.filter((value) => (value.timestamp >= start && value.timestamp < end));
    newLongAggregatedExecution = { timestamp: start, price: 0, buySize: 0, sellSize: 0, totalSize: 0, };
    // 10秒間隔のデータを1時間分蓄えるので、通常であれば配列長は360あるが、エラーなどで登録されないとこれより減る。8割以上あれば登録する。
    if (targetExecutions.length > 360 * 0.8) {
      for (let execution of targetExecutions) {
        newLongAggregatedExecution.price += execution.price * execution.totalSize;
        newLongAggregatedExecution.buySize += execution.buySize;
        newLongAggregatedExecution.sellSize += execution.sellSize;
        newLongAggregatedExecution.totalSize += execution.totalSize;
      }
      if (newLongAggregatedExecution.totalSize === 0) {
        await handleError(__filename, 'aggregateExecution', 'code', '1時間の全取引量が0と判定されました。。', { executions, shortAggregatedExecutions, longAggregatedExecutions, std, });
      } else {
        newLongAggregatedExecution.price = newLongAggregatedExecution.price / newLongAggregatedExecution.totalSize;
      }
    }
  }

  return {
    newShortAggregatedExecutions,
    newLongAggregatedExecution
  };

};

/**
 * 対象区間の約定のリストから、短期集計約定を作成する。
 * @param executions 対象の約定リスト。
 * @param timestamp 集計期間の開始点のUnix Timestamp。
 * @returns 短期集計約定。
 */
export const aggregateShort = (executions: Execution[], timestamp: number): ExecutionAggregated => {

  const aggregatedExecution: ExecutionAggregated = { timestamp: timestamp, price: 0, buySize: 0, sellSize: 0, totalSize: 0, };
  for (let execution of executions) {
    aggregatedExecution.price += execution.price * execution.size;
    aggregatedExecution.totalSize += execution.size;
    if (execution.side === 'BUY') aggregatedExecution.buySize += execution.size;
    if (execution.side === 'SELL') aggregatedExecution.sellSize += execution.size;
  }
  if (aggregatedExecution.totalSize !== 0) aggregatedExecution.price = aggregatedExecution.price / aggregatedExecution.totalSize;
  return aggregatedExecution;

};
