import handleError from "../../../HandleError/handleError";
import { ProductCode } from "../../../Main/productSettings";
import { sendRequest } from "./apiRequest";

type CancelOrderParams = {
  child_order_id?: string // キャンセルする注文のID。child_order_idかchild_order_acceptance_idのいずれかを指定する。
  child_order_acceptance_id?: string// キャンセルする注文のID。child_order_idかchild_order_acceptance_idのいずれかを指定する。
};

/**
 * 注文をキャンセルする。
 * @param productCode プロダクトコード。
 * @param params Bodyパラメータ。詳細は型定義を参照。
 * @returns 成功はtrue、失敗はfalse。
 */
export const cancelOrder = async (productCode: ProductCode, params: CancelOrderParams) => {

  if (!params.child_order_id && !params.child_order_acceptance_id) {
    await handleError(__filename, 'cancelOrder', 'code', '注文IDか注文受付IDのいずれかは必須です', { productCode, params, });
    return false;
  }
  const body = {
    product_code: productCode,
    ...params
  };
  const res = await sendRequest({ uri: 'me/cancelchildorder', method: 'POST', body }, true, true);
  if (!res) return false; // API通信でエラー、または200系でない。
  return true;

};