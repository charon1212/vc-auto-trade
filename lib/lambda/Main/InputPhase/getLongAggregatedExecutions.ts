import { searchLongExecutions } from "../../Interfaces/AWS/Dynamodb/longExecution";
import { ExecutionAggregated } from "../../Interfaces/DomainType";
import { ProductId } from "../productSettings";

export const getLongAggregatedExecutions = async (productId: ProductId, std: number,) => {

  // 基準時刻の2時間前のタイムスタンプ
  const stdBefore2hour = std - 2 * 60 * 60 * 1000;
  const result = await searchLongExecutions(productId, stdBefore2hour.toString(), std.toString());

  const aggregatedExecutions: ExecutionAggregated[] = [];
  for (let item of result?.result || []) {
    aggregatedExecutions.push(item.data);
  }
  return aggregatedExecutions;

};
