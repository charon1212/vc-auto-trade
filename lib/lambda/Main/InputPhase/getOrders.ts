import { hasUncaughtExceptionCaptureCallback } from "process";
import { appLogger } from "../../Common/log";
import { asyncExecution } from "../../Common/util";
import { searchOrders } from "../../Interfaces/AWS/Dynamodb/order";
import { Order, OrderState } from "../../Interfaces/DomainType";
import { getParentOrderDetail } from "../../Interfaces/ExchangeApi/Bitflyer/getParentOrderDetail";
import { getOrder } from "../../Interfaces/ExchangeApi/order";
import { getParentOrder } from "../../Interfaces/ExchangeApi/parentOrder";

export const getOrders = async (productCode: string,) => {

  // DynamoDBからオーダー一覧を取得する
  let activeOrderFromDb: Order[] = [], unknownOrderFromDb: Order[] = [];
  await asyncExecution(
    async () => { unknownOrderFromDb = (await searchOrders(productCode, 'UNKNOWN')).result?.map((item) => item.data) || [] },
    async () => { activeOrderFromDb = (await searchOrders(productCode, 'ACTIVE')).result?.map((item) => item.data) || [] },
  );

  const orderListFromDb: Order[] = [];
  orderListFromDb.push(...unknownOrderFromDb);
  orderListFromDb.push(...activeOrderFromDb);

  const resultOrderList: { order: Order, beforeState: OrderState }[] = [];

  const syncronizeOrderFuncList = orderListFromDb.map((order) => {
    return async () => {
      if (order.parentSortMethod === 'NORMAL') {
        const orderFromApi = (await getOrder(productCode, undefined, order.acceptanceId))[0];
        const beforeState = order.state;
        if (orderFromApi) {
          // 同期処理
          order.id = orderFromApi.id;
          order.orderId = orderFromApi.orderId;
          order.state = orderFromApi.state;
          order.childOrderList[0].averagePrice = orderFromApi.averagePrice;
          order.childOrderList[0].state = orderFromApi.state;
          order.childOrderList[0].outstandingSize = orderFromApi.outstandingSize;
          order.childOrderList[0].cancelSize = orderFromApi.cancelSize;
          order.childOrderList[0].executedSize = orderFromApi.executedSize;
        }
        resultOrderList.push({ order, beforeState });
      } else {
        // 特殊注文どうしよう。。。いったん保留。
        resultOrderList.push({ order, beforeState: order.state });
        const orderFromApi = (await getParentOrder(productCode, order.acceptanceId));
        const orderDetailFromApi = await getParentOrderDetail(productCode, { parent_order_acceptance_id: order.acceptanceId });
        appLogger.info('▼▼▼特殊注文のAPI取得データ▼▼▼');
        appLogger.info(JSON.stringify({ orderFromApi, orderDetailFromApi }));
        // throw new Error('未実装');
      }
    };
  });

  await asyncExecution(...syncronizeOrderFuncList);

  return resultOrderList;

};