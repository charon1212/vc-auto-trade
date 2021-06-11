import { Order } from "../../Interfaces/DomainType";
import { aggregateExecution } from "./aggregateExecution";
import { ExecutePhaseFunction } from "./interface";
import { main } from "./OrderLogic/main";

export const execute: ExecutePhaseFunction = async (input) => {

  const { executions, shortAggregatedExecutions, longAggregatedExecutions, orders, balanceReal, balanceVirtual, productSetting, std } = input;

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
