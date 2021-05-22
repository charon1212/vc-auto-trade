import { Execution } from "../../../Interfaces/DomainType";
import handleError from "../../../HandleError/handleError";
import { db } from "./db";
import { processEnv } from "../../../Common/processEnv";
import { appLogger } from "../../../Common/log";

const suffixExecution = 'EXEC';

const getExecutionClassType = (productCode: string) => {
  return productCode + suffixExecution;
}

export const setExecution = async (productCode: string, sortKey: string, data: Execution[]) => {

  appLogger.info(`DynamoDB::setExecution, productCode:${productCode}, sortKey: ${sortKey}, data: ${JSON.stringify(data)}`);

  try {
    await db.put({
      TableName: processEnv.TableName,
      Item: {
        ClassType: getExecutionClassType(productCode),
        SortKey: sortKey,
        ExecutionList: data,
      }
    }).promise();
  } catch (err) {
    await handleError(__filename, 'setExecution', 'code', 'DBの保存に失敗。', { productCode, sortKey, data, }, err);
  }

};

export type ExecutionDynamoDB = {
  ClassType: string,
  SortKey: string,
  ExecutionList: Execution[],
}

/**
 * 約定履歴の一覧を取得する。
 * @param productCode プロダクトコード。
 * @param sortKeyStart ソートキーの開始。境界値は最終結果に含まれる。
 * @param sotrKeyEnd ソートキーの終了。境界値は最終結果に含まれる。
 */
export const searchExecutions = async (productCode: string, sortKeyStart: string, sotrKeyEnd: string) => {
  try {
    const res = await db.query({
      TableName: processEnv.TableName,
      KeyConditionExpression: '#PK = :pk AND #SK BETWEEN :sk1 AND :sk2',
      ExpressionAttributeNames: {
        '#PK': 'ClassType',
        '#SK': 'SortKey',
      },
      ExpressionAttributeValues: {
        ':pk': getExecutionClassType(productCode),
        ':sk1': sortKeyStart,
        ':sk2': sotrKeyEnd,
      }
    }).promise();
    appLogger.info(`DynamoDB::searchExecutions, productCode:${productCode}, result: ${JSON.stringify(res)}`);
    return {
      count: res.Count,
      result: res.Items as ExecutionDynamoDB[],
    };
  } catch (err) {
    await handleError(__filename, 'searchExecutions', 'code', 'DBの検索に失敗。', { productCode, sortKeyStart, sotrKeyEnd, }, err);
    return;
  }
};

/**
 * 約定履歴を削除する。
 *
 * @param productCode プロダクトコード
 * @param sortKey ソートキー
 * @returns 削除に成功すればtrue、失敗すればfalse。
 */
export const deleteExecution = async (productCode: string, sortKey: string) => {
  appLogger.info(`DynamoDB::deleteExecution, productCode:${productCode}, sortKey: ${sortKey}`);
  try {
    await db.delete({
      TableName: processEnv.TableName,
      Key: {
        ClassType: getExecutionClassType(productCode),
        SortKey: sortKey,
      }
    }).promise();
    return true;
  } catch (err) {
    await handleError(__filename, 'deleteExecution', 'code', 'DBの削除に失敗。', { productCode, sortKey, }, err);
    return false;
  }
}
