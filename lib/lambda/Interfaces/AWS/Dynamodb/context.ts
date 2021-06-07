import { appLogger } from "../../../Common/log";
import { processEnv } from "../../../Common/processEnv";
import handleError from "../../../HandleError/handleError";
import { db } from "./db";

export type VCATProductContext = {
  lastExecution?: {
    id?: number,
    timestamp?: number,
  },
  orderPhase?: OrderPhase,
  orderAcceptanceId?: string,
  buyOrderPrice?: number,
  stopLossTimestamp?: number,
  makeNewOrder?: boolean,
};
export type OrderPhase = 'Buying' | 'BuyOrderWaiting' | 'Selling' | 'SellOrderWaiting' | 'StopLoss';
type ContextRecord = {
  ClassType: string,
  SortKey: string,
  data: VCATProductContext,
};

const contextSortKey = 'context';
const suffixContext = 'CONTEXT';

const getProductContextClassType = (productCode: string) => {
  return productCode + suffixContext;
};

export const getProductContext = async (productCode: string): Promise<VCATProductContext> => {
  try {
    const res = await db.get({
      TableName: processEnv.TableName,
      Key: {
        'ClassType': getProductContextClassType(productCode),
        'SortKey': contextSortKey,
      },
    }).promise();
    appLogger.info(`DynamoDB::getProductContext, productCode:${productCode}, result: ${JSON.stringify(res)}`);
    if (res.Item) {
      const record = res.Item as ContextRecord;
      return record.data;
    } else {
      return { orderPhase: 'Buying' };
    }
  } catch (err) {
    await handleError(__filename, 'getProductContextClassType', 'code', 'ProductContextの取得に失敗。', { productCode }, err);
    return { orderPhase: 'Buying' };
  }
};

export const setProductContext = async (productCode: string, data: VCATProductContext) => {
  const item: ContextRecord = {
    ClassType: getProductContextClassType(productCode),
    SortKey: contextSortKey,
    data: data,
  };
  appLogger.info(`DynamoDB::setProductContext, productCode:${productCode}, item: ${JSON.stringify(item)}`);
  try {
    await db.put({
      TableName: processEnv.TableName,
      Item: item,
    }).promise();
  } catch (err) {
    await handleError(__filename, 'setProductContext', 'code', 'ProductContextの保存に失敗。', { productCode, data }, err);
    return;
  }
};
