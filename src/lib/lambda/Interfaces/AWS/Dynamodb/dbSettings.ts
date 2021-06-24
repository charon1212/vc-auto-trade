import { LambdaExecutionLive } from "../../../Main/LambdaExecutionChecker";
import { ExecutionAggregated, OrderState, SimpleOrder, VCATProductContext } from "../../DomainType";
import { DbSetting } from "./db";

/** ■■■■コンテキスト■■■■ */
export const sortKeyContext = 'context';
export const dbSettingProductContext: DbSetting<VCATProductContext, VCATProductContext> = {
  id: 'context',
  classTypeSuffix: 'CONTEXT',
  sortKey: (item) => (sortKeyContext),
  encode: (item) => (item),
  decode: (item) => (item),
};

/** ■■■■短期集計約定■■■■ */
export const dbSettingExecution: DbSetting<ExecutionAggregated[], ExecutionAggregated[]> = {
  id: 'execution',
  classTypeSuffix: 'EXEC',
  sortKey: (item) => (item[0]?.timestamp?.toString() || 'no-item'),
  encode: (item) => (item),
  decode: (item) => (item),
};

/** ■■■■長期集計約定■■■■ */
export const dbSettingLongExecution: DbSetting<ExecutionAggregated, ExecutionAggregated> = {
  id: 'longExecution',
  classTypeSuffix: 'LONG_EXEC',
  sortKey: (item) => (item.timestamp.toString()),
  encode: (item) => (item),
  decode: (item) => (item),
};

/** ■■■■注文情報■■■■ */
type SimpleOrderDb = SimpleOrder & {
  orderDateTimestamp: number,
};
export const getOrderStateCode = (state: OrderState) => {
  if (state === 'UNKNOWN') return 'UNK';
  if (state === 'ACTIVE') return 'ACT';
  if (state === 'COMPLETED') return 'COM';
  if (state === 'INVALID') return 'INV';
  return '';
}
export const getOrderSortKey = (state: OrderState, id: string, orderDate: Date,) => {
  const stateCode = getOrderStateCode(state);
  return stateCode + orderDate.getTime().toString() + id;
}

export const dbSettingOrder: DbSetting<SimpleOrder, SimpleOrderDb> = {
  id: 'order',
  classTypeSuffix: 'ORDER',
  sortKey: (order) => (getOrderSortKey(order.state, order.id, order.orderDate)),
  encode: (order) => ({ ...order, orderDateTimestamp: order.orderDate.getTime(), }),
  decode: (order) => ({ ...order, orderDate: new Date(order.orderDateTimestamp) }),
};

/** ■■■■Lambda実行死活情報■■■■ */
export const dbSettingLambdaExecutionLive: DbSetting<LambdaExecutionLive, LambdaExecutionLive> = {
  id: 'lambdaExecutionLive',
  classTypeSuffix: 'LAMBDA_LIVE',
  sortKey: (item) => (item.timestamp.toString()),
  encode: (item) => (item),
  decode: (item) => (item),
};

