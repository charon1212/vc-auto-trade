import { appLogger } from "../../../Common/log";
import { processEnv } from "../../../Common/processEnv";
import handleError from "../../../HandleError/handleError";
import { ProductId } from "../../../Main/productSettings";
import { ExecutionAggregated } from "../../DomainType";
import { db, putDynamoDB, searchDynamoDB } from "./db";

const suffixLongExecution = 'LONG_EXEC';

const getLongExecutionClassType = (productId: ProductId) => {
  return productId + suffixLongExecution;
}

export const setLongExecution = async (productId: ProductId, sortKey: string, data: ExecutionAggregated) => {

  const classType = getLongExecutionClassType(productId);
  appLogger.info3(`▲▲${productId}-AWS-DynamoDB-setLongExecution-CALL-${JSON.stringify({ classType, sortKey, data })}`);

  try {
    await putDynamoDB({ ClassType: classType, SortKey: sortKey, data: data, });
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

  const classType = getLongExecutionClassType(productId);
  appLogger.info3(`▲▲${productId}-AWS-DynamoDB-searchLongExecutions-CALL-${JSON.stringify({ classType, sortKeyStart, sotrKeyEnd })}`);

  try {
    const res = await searchDynamoDB({
      condition: '#PK = :pk AND #SK BETWEEN :sk1 AND :sk2',
      paramLabel: { '#PK': 'ClassType', '#SK': 'SortKey', },
      paramValue: { ':pk': classType, ':sk1': sortKeyStart, ':sk2': sotrKeyEnd, },
    });
    appLogger.info3(`▲▲${productId}-AWS-DynamoDB-searchLongExecutions-RESULT-${JSON.stringify({ res })}`);
    return {
      count: res.Count,
      result: res.Items as LongExecutionDynamoDB[] | undefined,
    };
  } catch (err) {
    await handleError(__filename, 'searchLongExecutions', 'code', 'DBの検索に失敗。', { productId, sortKeyStart, sotrKeyEnd, }, err);
    return;
  }
};
