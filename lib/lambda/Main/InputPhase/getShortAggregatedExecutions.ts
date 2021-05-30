import { searchExecutions } from "../../Interfaces/AWS/Dynamodb/execution";
import { ExecutionAggregated } from "../../Interfaces/DomainType";

export const getShortAggregatedExecutions = async (productCode: string, std: number,) => {

  // 基準時刻の2時間前のタイムスタンプ
  const stdBefore2hour = std - 2 * 60 * 60 * 1000;
  const result = await searchExecutions(productCode, stdBefore2hour.toString(), std.toString());

  const aggregatedExecutions: ExecutionAggregated[] = [];
  for (let item of result?.result || []) {
    aggregatedExecutions.push(...item.ExecutionList);
  }
  return aggregatedExecutions;

};