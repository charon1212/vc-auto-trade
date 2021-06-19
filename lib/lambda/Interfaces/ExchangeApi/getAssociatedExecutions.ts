import { appLogger } from "../../Common/log";
import { ProductSetting } from "../../Main/productSettings";
import { SimpleOrder } from "../DomainType";
import { getExecutions } from "./GMO/getExecutions";

export const getAssociatedExecutions = async (productSetting: ProductSetting, order: SimpleOrder) => {

  appLogger.info2(`★★${productSetting.id}-API-getAssociatedExecutions-CALL-${JSON.stringify({ productSetting, order, })}`);
  if (productSetting.exchangeCode !== 'GMO') throw new Error('GMO以外は対象外です。');
  const res = await getExecutions(order.idGmo);
  const result = res.map((item) => ({
    executionId: item.executionId,
    side: item.side,
    size: item.size,
    price: item.price,
    fee: item.fee,
  }));
  appLogger.info2(`★★${productSetting.id}-API-getAssociatedExecutions-RESULT-${JSON.stringify({ result, })}`);
  return result;

};
