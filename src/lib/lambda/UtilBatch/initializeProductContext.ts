import { getProductContext, importProductContextFromDb, saveProductContext } from "../Main/context";
import { ProductId } from "../Main/productSettings";
import { executeSpecificProduct } from "./util";

/**
 * プロダクトコンテキストを初期化する。
 * @param productId 初期化するプロダクトのプロダクトID。
 */
export const initializeProductContext = async (productId: ProductId | 'All') => {
  await importProductContextFromDb();
  await executeSpecificProduct(productId, async (productSetting) => {
    const context = await getProductContext(productSetting.id);
    if (!context) return;
    if (context.orderPhase === undefined) context.orderPhase = 'Buy';
    if (context.afterSendOrder === undefined) context.afterSendOrder = false;
    if (context.executionSetting === undefined) {
      context.executionSetting = {
        executePhase: true,
        executeMain: true,
        makeNewOrder: true,
      };
    }
  });
  await saveProductContext();
};