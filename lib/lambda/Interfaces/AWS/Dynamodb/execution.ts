import { ExecutionAggregated } from "../../../Interfaces/DomainType";
import handleError from "../../../HandleError/handleError";
import { db, putDynamoDB, searchDynamoDB } from "./db";
import { processEnv } from "../../../Common/processEnv";
import { appLogger } from "../../../Common/log";
import { ProductId } from "../../../Main/productSettings";

const suffixExecution = 'EXEC';

const getExecutionClassType = (productId: ProductId) => {
  return productId + suffixExecution;
}

export const setExecution = async (productId: ProductId, sortKey: string, data: ExecutionAggregated[]) => {

  const classType = getExecutionClassType(productId);
  appLogger.info3(`▲▲${productId}-AWS-DynamoDB-setExecution-CALL-${JSON.stringify({ classType, sortKey, data, })}`);

  try {
    await putDynamoDB({ ClassType: classType, SortKey: sortKey, ExecutionList: data, });
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
  const classType = getExecutionClassType(productId);
  appLogger.info3(`▲▲${productId}-AWS-DynamoDB-searchExecutions-CALL-${JSON.stringify({ classType, sortKeyStart, sotrKeyEnd, })}`);

  try {
    const res = await searchDynamoDB({
      condition: '#PK = :pk AND #SK BETWEEN :sk1 AND :sk2',
      paramLabel: { '#PK': 'ClassType', '#SK': 'SortKey', },
      paramValue: { ':pk': classType, ':sk1': sortKeyStart, ':sk2': sotrKeyEnd, },
    });
    appLogger.info3(`▲▲${productId}-AWS-DynamoDB-searchExecutions-RESULT-${JSON.stringify({ res })}`);
    return {
      count: res.Count,
      result: res.Items as ExecutionDynamoDB[] | undefined,
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
  const classType = getExecutionClassType(productId);
  appLogger.info3(`▲▲${productId}-AWS-DynamoDB-deleteExecution-CALL-${JSON.stringify({ classType, sortKey, })}`);

  try {
    await db.delete({
      TableName: processEnv.TableName,
      Key: {
        ClassType: classType,
        SortKey: sortKey,
      }
    }).promise();
    return true;
  } catch (err) {
    await handleError(__filename, 'deleteExecution', 'code', 'DBの削除に失敗。', { productId, sortKey, }, err);
    return false;
  }
}
