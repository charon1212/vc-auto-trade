import { searchDynamoDbBetween, } from "../../Interfaces/AWS/Dynamodb/db";
import { dbSettingLongExecution } from "../../Interfaces/AWS/Dynamodb/dbSettings";
import { ExecutionAggregated } from "../../Interfaces/DomainType";
import { ProductSetting } from "../productSettings";

export const getLongAggregatedExecutions = async (productSetting: ProductSetting, std: number,) => {

  // 基準時刻の2時間前のタイムスタンプ
  const stdBefore2hour = std - 2 * 60 * 60 * 1000;
  const result = await searchDynamoDbBetween(productSetting, dbSettingLongExecution, stdBefore2hour.toString(), std.toString());

  const aggregatedExecutions: ExecutionAggregated[] = [];
  for (let item of result.items) {
    aggregatedExecutions.push(item);
  }
  return aggregatedExecutions;

};
