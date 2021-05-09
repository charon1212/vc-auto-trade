import { importProductContextFromDb, saveProductContext } from "./context";
import saveExecutionHistory from "./ExecutionHistory/saveExecutionHistory";
import { ProductSetting, productSettings } from "./productSettings";

export const entry = async () => {

  const now = new Date();
  const before1min = new Date(now.getTime() - 60 * 1000);

  await importProductContextFromDb();

  const promiseList: Promise<any>[] = [];
  for (let productSetting of productSettings) {
    promiseList.push(productEntry(productSetting, before1min));
  }
  await Promise.all(promiseList);

  await saveProductContext();
  return '';

};

/** プロダクトごとのエントリー */
const productEntry = async (productSetting: ProductSetting, before1min: Date) => {

  await saveExecutionHistory(productSetting.productCode, before1min);

};
