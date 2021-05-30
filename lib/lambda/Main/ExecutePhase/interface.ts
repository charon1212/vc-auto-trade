import { Balance, Execution, ExecutionAggregated, Order } from "../../Interfaces/DomainType";

export type Input = {
  executions: Execution[],
  shortAggregatedExecutions: ExecutionAggregated[],
  longAggregatedExecutions: ExecutionAggregated[],
  orders: Order[],
  balanceReal: Balance,
  balanceVirtual: Balance,
};
export type Output = {
  updatedOrder: Order[],
  newAggregatedExecutions: ExecutionAggregated[],
  newLongAggregatedExecution?: ExecutionAggregated,
};

export type ExecutePhaseFunction = (input: Input) => Promise<Output>;
