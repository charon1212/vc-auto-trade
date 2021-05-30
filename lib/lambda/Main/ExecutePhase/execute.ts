import { aggregateExecution } from "./aggregateExecution";
import { ExecutePhaseFunction } from "./interface";

export const execute: ExecutePhaseFunction = async (input) => {

  const { executions, shortAggregatedExecutions, longAggregatedExecutions, orders, balanceReal, balanceVirtual, productSetting, std } = input;

  const { newShortAggregatedExecutions, newLongAggregatedExecution } =
    await aggregateExecution(executions, shortAggregatedExecutions, longAggregatedExecutions, std);

  return {
    newAggregatedExecutions: [],
    updatedOrder: [],
    newLongAggregatedExecution: undefined,
  };

};