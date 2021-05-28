import { appLogger } from "../../../Common/log";
import { processEnv } from "../../../Common/processEnv";
import handleError from "../../../HandleError/handleError";
import { Order, OrderState } from "../../DomainType";
import { db } from "./db";

const suffixOrder = 'ORDER';

const getOrderClassType = (productCode: string) => {
  return productCode + suffixOrder;
}

const stateMap = [
  { state: 'UNKNOWN', stateCode: 'UNK' },
  { state: 'ACTIVE', stateCode: 'ACT' },
  { state: 'REJECTED', stateCode: 'REJ' },
  { state: 'COMPLETED', stateCode: 'COM' },
  { state: 'CANCELED', stateCode: 'CAN' },
  { state: 'EXPIRED', stateCode: 'EXP' },
];
const getStateCode = (state: string) => {
  return stateMap.find((item) => item.state === state)?.stateCode;
};

type OrderTimestamp = {
  sort: 'NORMAL' | 'PARENT',
  id: number,
  side: 'BUY' | 'SELL',
  orderType?: 'LIMIT' | 'MARKET',
  parentOrderType?: 'LIMIT' | 'MARKET' | 'STOP' | 'STOP_LIMIT' | 'TRAIL' | 'IFD' | 'OCO' | 'IFDOCO',
  price?: number,
  averagePrice: number,
  size: number,
  state: OrderState,
  expireDateTimestamp: number,
  orderDateTimestamp: number,
  acceptanceId: string,
  outstandingSize: number,
  cancelSize: number,
  executedSize: number,
};

export type OrderDynamoDB = {
  ClassType: string,
  SortKey: string,
  data: Order,
}

/**
 * 注文情報を新規登録・更新する。
 * @param productCode 
 * @param sortKey 
 * @param data 
 */
export const setOrder = async (productCode: string, timestamp: number, data: Order) => {

  appLogger.info(`DynamoDB::setLongExecution, productCode:${productCode}, timestamp: ${timestamp}, data: ${JSON.stringify(data)}`);

  const stateCode = getStateCode(data.state);
  if (!stateCode) {
    await handleError(__filename, 'setOrder', 'code', 'stateCodeが取得できませんでした。', { productCode, timestamp, data, },);
    return;
  }
  const sortKey = getStateCode(data.state) + timestamp.toString();
  const convertedData: OrderTimestamp = {
    ...data,
    expireDateTimestamp: data.expireDate.getTime(),
    orderDateTimestamp: data.orderDate.getTime(),
  }

  try {
    await db.put({
      TableName: processEnv.TableName,
      Item: {
        ClassType: getOrderClassType(productCode),
        SortKey: sortKey,
        data: convertedData,
      }
    }).promise();
  } catch (err) {
    await handleError(__filename, 'setOrder', 'code', 'DBの保存に失敗。', { productCode, timestamp, data, }, err);
  }

};

/**
 * 指定した状態の注文の一覧を取得する。
 * @param productCode プロダクトコード。
 * @param state 検索対象の注文状態。
 */
export const searchOrders = async (productCode: string, state: OrderState,) => {

  const stateCode = getStateCode(state);
  if (!stateCode) {
    await handleError(__filename, 'setOrder', 'code', 'stateCodeが取得できませんでした。', { productCode, state, },);
    return { count: 0, result: [] };
  }

  try {
    const res = await db.query({
      TableName: processEnv.TableName,
      KeyConditionExpression: '#PK = :pk AND begins_with (#SK, :skprefix)',
      ExpressionAttributeNames: {
        '#PK': 'ClassType',
        '#SK': 'SortKey',
      },
      ExpressionAttributeValues: {
        ':pk': getOrderClassType(productCode),
        ':skprefix': stateCode,
      },
    }).promise();
    appLogger.info(`DynamoDB::searchOrders, productCode:${productCode}, result: ${JSON.stringify(res)}`);
    const resultItem = res.Items as { ClassType: string, SortKey: string, data: OrderTimestamp, }[] | undefined;
    return {
      count: res.Count,
      result: resultItem?.map((item): OrderDynamoDB => ({
        ClassType: item.ClassType,
        SortKey: item.SortKey,
        data: {
          ...item.data,
          expireDate: (new Date(item.data.expireDateTimestamp)),
          orderDate: (new Date(item.data.orderDateTimestamp)),
        },
      })),
    };
  } catch (err) {
    await handleError(__filename, 'searchOrders', 'code', 'DBの検索に失敗。', { productCode, state, }, err);
    return { count: 0, result: [] };
  }
};
