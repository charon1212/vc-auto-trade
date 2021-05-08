import { productCodeXRP } from "../const";
import saveExecutionHistory from "./ExecutionHistory/saveExecutionHistory";

export const entry = async () => {

  const now = new Date();
  const before1min = new Date(now.getTime() - 60 * 1000);

  await saveExecutionHistory(productCodeXRP, before1min);
  return '';

};