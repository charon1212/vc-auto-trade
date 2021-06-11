import handleError from "../../../HandleError/handleError";
import { ProductCode } from "../../../Main/productSettings";
import { OrderType } from "../../DomainType";
import { sendRequest } from "./apiRequest";

export type GetParentOrderDetailParams = {
  parent_order_id?: string,
  parent_order_acceptance_id?: string,
};
export type ParentOrderDetailBitflyer = {
  id: number,
  parent_order_id: string,
  order_method: string,
  expire_date: Date,
  time_in_force: string,
  parameters: {
    product_code: string,
    condition_type: OrderType,
    side: string,
    price?: number,
    size: number,
    trigger_price?: number,
    offset?: number,
  }[],
  parent_order_acceptance_id: string,
};

/**
 * 親注文の詳細を取得する。
 * @param productCode プロダクトコード。
 * @param params リクエストのクエリパラメータ。
 * @returns 親注文の詳細。
 */
export const getParentOrderDetail = async (productCode: ProductCode, params: GetParentOrderDetailParams): Promise<ParentOrderDetailBitflyer | undefined> => {

  if (!params.parent_order_id && !params.parent_order_acceptance_id) {
    await handleError(__filename, 'getParentOrderDetail', 'code', '受付IDか、注文IDのいずれかが必須です。', { productCode, params, });
    return undefined;
  }

  try {
    const res = await sendRequest({
      uri: 'me/getparentorder',
      method: 'GET',
      queryParams: params,
    }, true, true);
    if (!res) return undefined;
    const json = await res.json();
    json.expire_date = new Date(json.expire_date);
    return json as ParentOrderDetailBitflyer;
  } catch (err) {
    await handleError(__filename, 'getParentOrderDetail', 'code', 'API通信でエラー', { productCode, params, }, err);
    return undefined;
  }
};
