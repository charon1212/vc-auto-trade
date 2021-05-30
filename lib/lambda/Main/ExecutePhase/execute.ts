import { ExecutePhaseFunction } from "./interface";

export const execute: ExecutePhaseFunction = async (input) => {

  return {
    newAggregatedExecutions: [],
    updatedOrder: [],
    newLongAggregatedExecution: undefined,
  };

};