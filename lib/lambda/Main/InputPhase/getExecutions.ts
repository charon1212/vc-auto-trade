import { getProductContext } from "../context";
import { getExecutions as getExecutionsFromApi } from "../../Interfaces/ExchangeApi/getExecutions";

export const getExecutions = async (productCode: string, std: number) => {

  const productContext = await getProductContext(productCode);
  const lastExecutionId = productContext?.lastExecution?.id || undefined;

  // 基準時刻の1分前を取得する。
  const stdBefore1min = std - 60 * 1000;

  const executions = getExecutionsFromApi(stdBefore1min, productCode, lastExecutionId);
  return executions;

};
