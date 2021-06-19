import { appLogger } from "../../../Common/log";
import { processEnv } from "../../../Common/processEnv";
import handleError from "../../../HandleError/handleError";
import { ProductId } from "../../../Main/productSettings";
import { db, getDynamoDB, putDynamoDB } from "./db";

export type VCATProductContext = {
  lastExecution?: {
    id?: number,
    timestamp?: number,
  },
  orderPhase?: OrderPhase,
  afterSendOrder?: boolean,
  orderId?: string,
  buyOrderPrice?: number,
  makeNewOrder?: boolean,
  startBuyTimestamp?: number,
};
/**
 * オーダー状態
 * Buy: 買い注文のタイミング待ち、または買い注文を出してから約定するまでの間
 * Sell: 売り注文のタイミング待ち、または売り注文を出してから約定するまでの間
 * StopLoss: 損切判断後、損切の注文が約定するまでの間
 * WaitAfterStopLoss: 損切後の一時待機期間
 * Wait: 注文を一切行わない待機期間
 */
export type OrderPhase = 'Buy' | 'Sell' | 'StopLoss' | 'Wait';
type ContextRecord = {
  ClassType: string,
  SortKey: string,
  data: VCATProductContext,
};

const contextSortKey = 'context';
const suffixContext = 'CONTEXT';

const getProductContextClassType = (productId: ProductId) => {
  return productId + suffixContext;
};

export const getProductContext = async (productId: ProductId): Promise<VCATProductContext> => {
  try {
    const classType = getProductContextClassType(productId);
    appLogger.info3(`▲▲${productId}-AWS-DynamoDB-getProductContext-CALL-${JSON.stringify({ classType, contextSortKey })}`);
    const res = await getDynamoDB(classType, contextSortKey);
    appLogger.info3(`▲▲${productId}-AWS-DynamoDB-getProductContext-RESULT-${JSON.stringify({ res })}`);
    if (res) {
      const record = res as ContextRecord;
      return record.data;
    } else {
      return {};
    }
  } catch (err) {
    await handleError(__filename, 'getProductContextClassType', 'code', 'ProductContextの取得に失敗。', { productId }, err);
    return {};
  }
};

export const setProductContext = async (productId: ProductId, data: VCATProductContext) => {
  const classType = getProductContextClassType(productId);
  appLogger.info3(`▲▲${productId}-AWS-DynamoDB-setProductContext-CALL-${JSON.stringify({ data, classType, contextSortKey })}`);
  const item: ContextRecord = {
    ClassType: getProductContextClassType(productId),
    SortKey: contextSortKey,
    data: data,
  };
  try {
    await putDynamoDB(item);
  } catch (err) {
    await handleError(__filename, 'setProductContext', 'code', 'ProductContextの保存に失敗。', { productId, data }, err);
    return;
  }
};
