import handleError from "../../HandleError/handleError";
import { Execution, SimpleOrder, VCATProductContext } from "../../Interfaces/DomainType";
import { getProductContext } from "../context";
import { ProductId, ProductSetting, productSettings } from "../productSettings";
import { StandardTime } from "../StandardTime";
import { aggregateExecution } from "./aggregateExecution";
import { ExecutePhaseFunction } from "./interface";
import { main } from "./OrderLogic/main";

export const execute: ExecutePhaseFunction = async (input) => {

  const { executions, shortAggregatedExecutions, longAggregatedExecutions, orders, balanceReal, balanceVirtual, productSetting, std } = input;
  const context = await getProductContext(productSetting.id);

  await updateLastExecutionId(productSetting.id, executions, std);

  const { newShortAggregatedExecutions, newLongAggregatedExecution } =
    await aggregateExecution(executions, shortAggregatedExecutions, longAggregatedExecutions, std);

  const existOutManageOrder = await checkExistOutManageOrder(orders.map((item) => item.order), productSetting);

  let newOrders: SimpleOrder[] = [];
  if (context?.executionSetting?.executeMain && !existOutManageOrder) {
    newOrders = await main({
      shortAggregatedExecutions: [...shortAggregatedExecutions, ...newShortAggregatedExecutions],
      longAggregatedExecutions,
      orders: orders.map((value) => value.order),
      balanceReal,
      balanceVirtual,
      productSetting,
    });
  }

  return {
    newAggregatedExecutions: newShortAggregatedExecutions,
    updatedOrder: [...orders, ...newOrders.map((order) => ({ order, }))],
    newLongAggregatedExecution,
  };

};

/**
 * プロタクトコンテキストの「最後の約定」を設定する。
 */
const updateLastExecutionId = async (productId: ProductId, executions: Execution[], std: StandardTime) => {

  const lastExecution = executions.find((item) => (item.executionDate.getTime() < std.getStd()));
  if (lastExecution) {
    const context = await getProductContext(productId);
    if (context) {
      context.lastExecution = {
        id: lastExecution.id,
        timestamp: lastExecution.executionDate.getTime(),
      }
    }
  }

};

/**
 * 余計な注文情報が紛れていないか確認する。
 */
const checkExistOutManageOrder = async (orders: SimpleOrder[], setting: ProductSetting) => {
  const context = await getProductContext(setting.id);
  let exist = false;
  for (let order of orders) {
    // まだ有効な注文なのに、オーダーIDがコンテキストと異なる場合はエラーとして管理。
    if (order.id !== context?.orderId && (order.state === 'ACTIVE' || order.state === 'UNKNOWN')) {
      await handleError(__filename, 'existOutManageOrder', 'code', `追跡できない注文情報(ID=${order.id})が見つかりました。`, { orders, setting },);
      exist = true;
    }
  }
  return exist;
};
