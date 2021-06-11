import { ExecutionAggregated } from "../../../Interfaces/DomainType";
import handleError from "../../../HandleError/handleError";
import { db } from "./db";
import { processEnv } from "../../../Common/processEnv";
import { appLogger } from "../../../Common/log";
import { ProductId } from "../../../Main/productSettings";

const suffixExecution = 'EXEC';

const getExecutionClassType = (productId: ProductId) => {
  return productId + suffixExecution;
}

export const setExecution = async (productId: ProductId, sortKey: string, data: ExecutionAggregated[]) => {

  appLogger.info(`DynamoDB::setExecution, productId:${productId}, sortKey: ${sortKey}, data: ${JSON.stringify(data)}`);

  try {
    await db.put({
      TableName: processEnv.TableName,
      Item: {
        ClassType: getExecutionClassType(productId),
        SortKey: sortKey,
        ExecutionList: data,
      }
    }).promise();
  } catch (err) {
    await handleError(__filename, 'setExecution', 'code', 'DBの保存に失敗。', { productId, sortKey, data, }, err);
  }

};

export type ExecutionDynamoDB = {
  ClassType: string,
  SortKey: string,
  ExecutionList: ExecutionAggregated[],
}

/**
 * 約定履歴の一覧を取得する。
 * @param productId プロダクトコード。
 * @param sortKeyStart ソートキーの開始。境界値は最終結果に含まれる。
 * @param sotrKeyEnd ソートキーの終了。境界値は最終結果に含まれる。
 */
export const searchExecutions = async (productId: ProductId, sortKeyStart: string, sotrKeyEnd: string) => {
  try {
    const res = await db.query({
      TableName: processEnv.TableName,
      KeyConditionExpression: '#PK = :pk AND #SK BETWEEN :sk1 AND :sk2',
      ExpressionAttributeNames: {
        '#PK': 'ClassType',
        '#SK': 'SortKey',
      },
      ExpressionAttributeValues: {
        ':pk': getExecutionClassType(productId),
        ':sk1': sortKeyStart,
        ':sk2': sotrKeyEnd,
      }
    }).promise();
    appLogger.info(`DynamoDB::searchExecutions, ${JSON.stringify({ productId, sortKeyStart, sotrKeyEnd, result: res })}`);
    return {
      count: res.Count,
      result: res.Items as ExecutionDynamoDB[],
    };
  } catch (err) {
    await handleError(__filename, 'searchExecutions', 'code', 'DBの検索に失敗。', { productId, sortKeyStart, sotrKeyEnd, }, err);
    return;
  }
};

/**
 * 約定履歴を削除する。
 *
 * @param productId プロダクトコード
 * @param sortKey ソートキー
 * @returns 削除に成功すればtrue、失敗すればfalse。
 */
export const deleteExecution = async (productId: ProductId, sortKey: string) => {
  appLogger.info(`DynamoDB::deleteExecution, productId:${productId}, sortKey: ${sortKey}`);
  try {
    await db.delete({
      TableName: processEnv.TableName,
      Key: {
        ClassType: getExecutionClassType(productId),
        SortKey: sortKey,
      }
    }).promise();
    return true;
  } catch (err) {
    await handleError(__filename, 'deleteExecution', 'code', 'DBの削除に失敗。', { productId, sortKey, }, err);
    return false;
  }
}
