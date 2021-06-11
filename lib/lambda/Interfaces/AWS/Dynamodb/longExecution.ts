import { appLogger } from "../../../Common/log";
import { processEnv } from "../../../Common/processEnv";
import handleError from "../../../HandleError/handleError";
import { ProductId } from "../../../Main/productSettings";
import { ExecutionAggregated } from "../../DomainType";
import { db } from "./db";

const suffixLongExecution = 'LONG_EXEC';

const getLongExecutionClassType = (productId: ProductId) => {
  return productId + suffixLongExecution;
}

export const setLongExecution = async (productId: ProductId, sortKey: string, data: ExecutionAggregated) => {

  appLogger.info(`DynamoDB::setLongExecution, productId:${productId}, sortKey: ${sortKey}, data: ${JSON.stringify(data)}`);

  try {
    await db.put({
      TableName: processEnv.TableName,
      Item: {
        ClassType: getLongExecutionClassType(productId),
        SortKey: sortKey,
        data: data,
      }
    }).promise();
  } catch (err) {
    await handleError(__filename, 'setLongExecution', 'code', 'DBの保存に失敗。', { productId, sortKey, data, }, err);
  }

};

export type LongExecutionDynamoDB = {
  ClassType: string,
  SortKey: string,
  data: ExecutionAggregated,
}

/**
 * 長期集計約定履歴の一覧を取得する。
 * @param productId プロダクトコード。
 * @param sortKeyStart ソートキーの開始。境界値は最終結果に含まれる。
 * @param sotrKeyEnd ソートキーの終了。境界値は最終結果に含まれる。
 */
export const searchLongExecutions = async (productId: ProductId, sortKeyStart: string, sotrKeyEnd: string) => {
  try {
    const res = await db.query({
      TableName: processEnv.TableName,
      KeyConditionExpression: '#PK = :pk AND #SK BETWEEN :sk1 AND :sk2',
      ExpressionAttributeNames: {
        '#PK': 'ClassType',
        '#SK': 'SortKey',
      },
      ExpressionAttributeValues: {
        ':pk': getLongExecutionClassType(productId),
        ':sk1': sortKeyStart,
        ':sk2': sotrKeyEnd,
      }
    }).promise();
    appLogger.info(`DynamoDB::searchLongExecutions, productId:${productId}, result: ${JSON.stringify(res)}`);
    return {
      count: res.Count,
      result: res.Items as LongExecutionDynamoDB[] | undefined,
    };
  } catch (err) {
    await handleError(__filename, 'searchLongExecutions', 'code', 'DBの検索に失敗。', { productId, sortKeyStart, sotrKeyEnd, }, err);
    return;
  }
};
