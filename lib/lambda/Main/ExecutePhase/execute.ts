import { Execution, Order } from "../../Interfaces/DomainType";
import { getProductContext } from "../context";
import { ProductId } from "../productSettings";
import { StandardTime } from "../StandardTime";
import { aggregateExecution } from "./aggregateExecution";
import { ExecutePhaseFunction } from "./interface";
import { main } from "./OrderLogic/main";

export const execute: ExecutePhaseFunction = async (input) => {

  const { executions, shortAggregatedExecutions, longAggregatedExecutions, orders, balanceReal, balanceVirtual, productSetting, std } = input;

  await updateLastExecutionId(productSetting.id, executions, std);

  const { newShortAggregatedExecutions, newLongAggregatedExecution } =
    await aggregateExecution(executions, shortAggregatedExecutions, longAggregatedExecutions, std);

  let newOrders: Order[] = [];
  if (productSetting.executeOrderPhase) {
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
 * プロダクトコンテキストを更新する
 * @param executions 
 * @param std 
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
