import { ExecutionItem } from "../ExecutionHistory/saveExecutionHistory";
import * as AWS from 'aws-sdk';
import handleError from "../HandleError/handleError";

const db = new AWS.DynamoDB.DocumentClient();

const suffixExecution = 'EXEC';

export const setExecution = async (productCode: string, sortKey: string, data: ExecutionItem[]) => {

  const classType = productCode + suffixExecution;
  try {
    await db.put({
      TableName: process.env.TableName || '',
      Item: {
        ClassType: classType,
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
 * @param classType 分類番号。
 * @param sortKeyStart ソートキーの開始。境界値は最終結果に含まれる。
 * @param sotrKeyEnd ソートキーの終了。境界値は最終結果に含まれる。
 */
export const searchExecutions = async (classType: string, sortKeyStart: string, sotrKeyEnd: string) => {

  try {

    const res = await db.query({
      TableName: process.env.TableName || '',
      KeyConditionExpression: '#PK = :pk AND #SK BETWEEN :sk1 AND :sk2',
      ExpressionAttributeNames: {
        '#PK': 'ClassType',
        '#SK': 'SortKey',
      },
      ExpressionAttributeValues: {
        ':pk': classType,
        ':sk1': sortKeyStart,
        ':sk2': sotrKeyEnd,
      }
    }).promise();

    return {
      count: res.Count,
      result: res.Items as ExecutionDynamoDB[],
    };

  } catch (err) {

    handleError('', `DBの検索に失敗。classType: ${classType}, sortKeyStart: ${sortKeyStart}, sortKeyEnd: ${sotrKeyEnd}`, err);
    return;

  }

};
