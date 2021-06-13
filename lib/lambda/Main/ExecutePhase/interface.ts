import { Balance, Execution, ExecutionAggregated, SimpleOrder, OrderState } from "../../Interfaces/DomainType";
import { ProductSetting } from "../productSettings";
import { StandardTime } from "../StandardTime";

export type Input = {
  executions: Execution[],
  shortAggregatedExecutions: ExecutionAggregated[],
  longAggregatedExecutions: ExecutionAggregated[],
  orders: { order: SimpleOrder, beforeState: OrderState }[],
  balanceReal: Balance,
  balanceVirtual: Balance,

  productSetting: ProductSetting,
  std: StandardTime,
};
export type Output = {
  updatedOrder: { order: SimpleOrder, beforeState?: OrderState }[],
  newAggregatedExecutions: ExecutionAggregated[],
  newLongAggregatedExecution?: ExecutionAggregated,
};

export type ExecutePhaseFunction = (input: Input) => Promise<Output>;
