import handleError from "../../HandleError/handleError";
import { Balance, Execution, ExecutionAggregated, OrderState, SimpleOrder } from "../../Interfaces/DomainType";
import { getProductContext } from "../context";
import { ProductId, ProductSetting } from "../productSettings";
import { StandardTime } from "../VcatDiContainer/StandardTime";
import { getVcatDiContainer } from "../VcatDiContainer/vcatDiContainer";
import { aggregateExecution } from "./aggregateExecution";
import { main } from "./OrderLogic/main";

type Input = {
  executions: Execution[],
  shortAggregatedExecutions: ExecutionAggregated[],
  longAggregatedExecutions: ExecutionAggregated[],
  orders: { order: SimpleOrder, beforeState: OrderState }[],
  balanceReal: Balance,
  balanceVirtual: Balance,

  productSetting: ProductSetting,
};
type Output = {
  updatedOrder: { order: SimpleOrder, beforeState?: OrderState }[],
  newAggregatedExecutions: ExecutionAggregated[],
  newLongAggregatedExecution?: ExecutionAggregated,
};

export const execute = async (input: Input): Promise<Output> => {

  const { executions, shortAggregatedExecutions, longAggregatedExecutions, orders, balanceReal, balanceVirtual, productSetting } = input;
  const context = await getProductContext(productSetting.id);
  const container = await getVcatDiContainer(productSetting.id);

  await updateLastExecutionId(productSetting.id, executions, container.standardTime);

  const { newShortAggregatedExecutions, newLongAggregatedExecution } =
    await aggregateExecution(executions, shortAggregatedExecutions, longAggregatedExecutions, container.standardTime);

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
 * ???????????????????????????????????????????????????????????????????????????
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
 * ????????????????????????????????????????????????????????????
 */
const checkExistOutManageOrder = async (orders: SimpleOrder[], setting: ProductSetting) => {
  const context = await getProductContext(setting.id);
  let exist = false;
  for (let order of orders) {
    // ?????????????????????????????????????????????ID?????????????????????????????????????????????????????????????????????
    if (order.id !== context?.orderId && (order.state === 'ACTIVE' || order.state === 'UNKNOWN')) {
      await handleError(__filename, 'existOutManageOrder', 'code', `??????????????????????????????(ID=${order.id})???????????????????????????`, { orders, setting },);
      exist = true;
    }
  }
  return exist;
};
