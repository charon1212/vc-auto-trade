import { productCodeXRP } from "./const";
import saveExecutionHistory from "./ExecutionHistory/saveExecutionHistory";

exports.handler = async function (event: any) {

  const now = new Date();
  const before1min = new Date(now.getTime() - 60 * 1000);

  await saveExecutionHistory(productCodeXRP, before1min);

  return '';

};