import { appLogger } from "../../../Common/log";
import { processEnv } from "../../../Common/processEnv";
import handleError from "../../../HandleError/handleError";
import { ProductId } from "../../../Main/productSettings";
import { SimpleOrder, OrderState } from "../../DomainType";
import { db, putDynamoDB, searchDynamoDB } from "./db";

const suffixOrder = 'ORDER';

const getOrderClassType = (productId: ProductId) => {
  return productId + suffixOrder;
}

const stateMap = [
  { state: 'UNKNOWN', stateCode: 'UNK' },
  { state: 'ACTIVE', stateCode: 'ACT' },
  { state: 'COMPLETED', stateCode: 'COM' },
  { state: 'INVALID', stateCode: 'INV' },
];
const getStateCode = (state: OrderState) => {
  return stateMap.find((item) => item.state === state)?.stateCode;
};

/** 保存用のOrder。日付型は文字列で保存されてしまうため、別途Unix Timestampを保存する。 */
type OrderSave = SimpleOrder & {
  orderDateTimestamp: number,
};

export type OrderDynamoDB = {
  ClassType: string,
  SortKey: string,
  data: SimpleOrder,
}

/**
 * 注文情報を新規登録・更新する。
 * @param productId 
 * @param sortKey 
 * @param data 
 */
export const setOrder = async (productId: ProductId, data: SimpleOrder) => {

  const classType = getOrderClassType(productId);
  const sortKey = await getSortKey(data.state, data.id, data.orderDate);
  if (!sortKey) return;

  const convertedData: OrderSave = {
    ...data,
    orderDateTimestamp: data.orderDate.getTime(),
  }

  appLogger.info3(`▲▲${productId}-AWS-DynamoDB-setOrder-CALL-${JSON.stringify({ classType, sortKey, convertedData, })}`);

  try {
    await putDynamoDB({ ClassType: classType, SortKey: sortKey, data: convertedData, });
  } catch (err) {
    await handleError(__filename, 'setOrder', 'code', 'DBの保存に失敗。', { productId, data, }, err);
  }

};

const getSortKey = async (state: OrderState, id: string, orderDate: Date,) => {
  const stateCode = getStateCode(state);
  if (!stateCode) {
    await handleError(__filename, 'getSortKey', 'code', 'stateCodeが取得できませんでした。', { state, id, orderDate, },);
    return undefined;
  }
  return stateCode + orderDate.getTime().toString() + id;
};

/**
 * 指定した状態の注文の一覧を取得する。
 * @param productId プロダクトコード。
 * @param state 検索対象の注文状態。
 */
export const searchOrders = async (productId: ProductId, state: OrderState,) => {

  const classType = getOrderClassType(productId);
  const stateCode = getStateCode(state);
  if (!stateCode) {
    await handleError(__filename, 'setOrder', 'code', 'stateCodeが取得できませんでした。', { productId, state, },);
    return { count: 0, result: [] };
  }

  appLogger.info3(`▲▲${productId}-AWS-DynamoDB-searchOrders-CALL-${JSON.stringify({ classType, stateCode, })}`);

  try {
    const res = await searchDynamoDB({
      condition: '#PK = :pk AND begins_with (#SK, :skprefix)',
      paramLabel: { '#PK': 'ClassType', '#SK': 'SortKey', },
      paramValue: { ':pk': classType, ':skprefix': stateCode, },
    });
    appLogger.info3(`▲▲${productId}-AWS-DynamoDB-searchOrders-RESULT-${JSON.stringify({ res, })}`);
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
    await handleError(__filename, 'searchOrders', 'code', 'DBの検索に失敗。', { productId, state, }, err);
    return { count: 0, result: [] };
  }
};

export const deleteOrder = async (productId: ProductId, state: OrderState, id: string, orderDate: Date,) => {
  const classType = getOrderClassType(productId);
  const sortKey = await getSortKey(state, id, orderDate);
  appLogger.info3(`▲▲${productId}-AWS-DynamoDB-deleteOrder-CALL-${JSON.stringify({ classType, sortKey, })}`);
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
    await handleError(__filename, 'deleteOrder', 'code', 'DBの削除に失敗。', { productId, state, id, orderDate, }, err);
    return false;
  }
};
