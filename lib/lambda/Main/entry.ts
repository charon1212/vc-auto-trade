import saveExecutionHistory from "./ExecutionHistory/saveExecutionHistory";
import { productSettings } from "./productSettings";

export const entry = async () => {

  const now = new Date();
  const before1min = new Date(now.getTime() - 60 * 1000);

  const promiseList: Promise<any>[] = [];
  for (let productSetting of productSettings) {
    promiseList.push(saveExecutionHistory(productSetting.productCode, before1min));
  }

  await Promise.all(promiseList);
  return '';

};