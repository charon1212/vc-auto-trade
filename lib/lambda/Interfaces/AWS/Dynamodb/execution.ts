import { ExecutionItem } from "../../../Main/ExecutionHistory/saveExecutionHistory";
import handleError from "../../../HandleError/handleError";
import { db } from "./db";

const suffixExecution = 'EXEC';

const getExecutionClassType = (productCode: string) => {
  return productCode + suffixExecution;
}

export const setExecution = async (productCode: string, sortKey: string, data: ExecutionItem[]) => {

  try {
    await db.put({
      TableName: process.env.TableName || '',
      Item: {
        ClassType: getExecutionClassType(productCode),
        SortKey: sortKey,
        ExecutionList: data,
      }
    }).promise();
  } catch (err) {
    handleError('', `setExecution::DBの保存に失敗。productCode:${productCode}, sortKey: ${sortKey}, data: ${data}`, err);
  }

};

export type ExecutionDynamoDB = {
  ClassType: string,
  SortKey: string,
  ExecutionList: ExecutionItem[],
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
      TableName: process.env.TableName || '',
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
    return {
      count: res.Count,
      result: res.Items as ExecutionDynamoDB[],
    };
  } catch (err) {
    handleError('', `DBの検索に失敗。productCode: ${productCode}, sortKeyStart: ${sortKeyStart}, sortKeyEnd: ${sotrKeyEnd}`, err);
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
  try {
    await db.delete({
      TableName: process.env.TableName || '',
      Key: {
        ClassType: getExecutionClassType(productCode),
        SortKey: sortKey,
      }
    }).promise();
    return true;
  } catch (err) {
    handleError('', `deleteExecution::DBの削除に失敗。productCode: ${productCode}, sortKey: ${sortKey}`, err);
    return false;
  }
}
