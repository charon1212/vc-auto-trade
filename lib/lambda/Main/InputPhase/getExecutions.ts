import { getProductContext } from "../context";
import { getExecutions as getExecutionsFromApi } from "../../Interfaces/ExchangeApi/getExecutions";
import { ProductSetting } from "../productSettings";

export const getExecutions = async (productSetting: ProductSetting, std: number) => {

  const productContext = await getProductContext(productSetting.id);
  const lastExecutionId = productContext?.lastExecution?.id || undefined;

  // 基準時刻の1分前を取得する。
  const stdBefore1min = std - 60 * 1000;

  const executions = await getExecutionsFromApi(stdBefore1min, productSetting.productCode, lastExecutionId);
  return executions;

};
