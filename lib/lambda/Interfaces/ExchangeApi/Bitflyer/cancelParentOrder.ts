import handleError from "../../../HandleError/handleError";
import { sendRequest } from "./apiRequest";

type CancelParentOrderParams = {
  parent_order_id?: string // キャンセルする注文のID。parent_order_idかparent_order_acceptance_idのいずれかを指定する。
  parent_order_acceptance_id?: string// キャンセルする注文のID。parent_order_idかparent_order_acceptance_idのいずれかを指定する。
};

/**
 * 注文をキャンセルする。
 * @param productCode プロダクトコード。
 * @param params Bodyパラメータ。詳細は型定義を参照。
 * @returns 成功はtrue、失敗はfalse。
 */
export const cancelParentOrder = async (productCode: string, params: CancelParentOrderParams) => {

  if (!params.parent_order_id && !params.parent_order_acceptance_id) {
    await handleError(__filename, 'cancelParentOrder', 'code', '注文IDか注文受付IDのいずれかは必須です', { productCode, params, });
    return false;
  }
  const body = {
    product_code: productCode,
    ...params
  };
  const res = await sendRequest({ uri: 'me/cancelparentorder', method: 'POST', body }, true, true);
  if (!res) return false; // API通信でエラー、または200系でない。
  return true;

};