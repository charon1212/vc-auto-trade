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
const getStateCode = (state: OrderState) => {
  return stateMap.find((item) => item.state === state)?.stateCode;
};

/** 保存用のOrder。日付型は文字列で保存されてしまうため、別途Unix Timestampを保存する。 */
type OrderSave = Order & {
  orderDateTimestamp: number,
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
export const setOrder = async (productCode: string, data: Order) => {

  const sortKey = await getSortKey(data.state, data.acceptanceId, data.orderDate);
  if (!sortKey) return;

  const convertedData: OrderSave = {
    ...data,
    orderDateTimestamp: data.orderDate.getTime(),
  }

  appLogger.info(`DynamoDB::setLongExecution, ${JSON.stringify({ productCode, sortKey, convertedData })}`);

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
    await handleError(__filename, 'setOrder', 'code', 'DBの保存に失敗。', { productCode, data, }, err);
  }

};

const getSortKey = async (state: OrderState, acceptanceId: string, orderDate: Date,) => {
  const stateCode = getStateCode(state);
  if (!stateCode) {
    await handleError(__filename, 'getSortKey', 'code', 'stateCodeが取得できませんでした。', { state, acceptanceId, orderDate, },);
    return undefined;
  }
  if (acceptanceId.length !== 25) {
    await handleError(__filename, 'getSortKey', 'code', '受付IDの桁数が25桁ではありません。', { state, acceptanceId, orderDate, },);
    return undefined;
  }
  return stateCode + orderDate.getTime().toString() + acceptanceId;
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
    const resultItem = res.Items as { ClassType: string, SortKey: string, data: OrderSave, }[] | undefined;
    return {
      count: res.Count,
      result: resultItem?.map((item): OrderDynamoDB => ({
        ClassType: item.ClassType,
        SortKey: item.SortKey,
        data: {
          ...item.data,
          orderDate: (new Date(item.data.orderDateTimestamp)),
        },
      })),
    };
  } catch (err) {
    await handleError(__filename, 'searchOrders', 'code', 'DBの検索に失敗。', { productCode, state, }, err);
    return { count: 0, result: [] };
  }
};

export const deleteOrder = async (productCode: string, state: OrderState, acceptanceId: string, orderDate: Date,) => {
  const sortKey = await getSortKey(state, acceptanceId, orderDate);
  appLogger.info(`DynamoDB::deleteOrder, productCode:${productCode}, sortKey: ${sortKey}`);
  try {
    await db.delete({
      TableName: processEnv.TableName,
      Key: {
        ClassType: getOrderClassType(productCode),
        SortKey: sortKey,
      }
    }).promise();
    return true;
  } catch (err) {
    await handleError(__filename, 'deleteOrder', 'code', 'DBの削除に失敗。', { productCode, state, acceptanceId, orderDate, }, err);
    return false;
  }
};
