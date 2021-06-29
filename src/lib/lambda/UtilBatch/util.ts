import { asyncExecutionArray } from "../Common/util";
import { getProductSettings, ProductId, ProductSetting } from "../Main/productSettings";

/**
 * 特定のプロダクトIDに対して、executorを実行する。
 * @param productId 特定のproductId。Allを指定すると、すべてのProductIdに対して並列実行する。
 * @param executor 実行する内容
 */
export const executeSpecificProduct = async (productId: ProductId | 'All', executor: (productSetting: ProductSetting) => Promise<void>) => {
  if (productId === 'All') {
    asyncExecutionArray(getProductSettings(), executor);
  } else {
    const productSetting = getProductSettings().find((s) => s.id === productId);
    if (productSetting) await executor(productSetting);
  }
};
