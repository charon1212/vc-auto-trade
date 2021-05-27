import handleError from "../../../HandleError/handleError";
import { sendRequest } from "./apiRequest";

type SendOrderParams = {
  child_order_type: 'LIMIT' | 'MARKET', // 指値注文はLIMIT、成行注文はMARKET
  side: 'BUY' | 'SELL', // 買い注文はBUY、売り注文はSELL
  price?: number, // 価格。child_order_typeがLIMITの場合は必須。
  size: number, // 注文数量
  minute_to_expire?: number, // 期限切れまでの時間。省略した場合は43200(30日間)。
  time_in_force?: 'GCT' | 'IOC' | 'FOK' // 執行数量条件。省略時はGCT。
};

type SendOrderResult = {
  child_order_acceptance_id: string, // 注文の受付ID。
};

/**
 * 新規注文を出す
 * @param productCode プロダクトコード。
 * @param params Bodyパラメータ。詳細は型定義を参照。
 * @returns エラー時はundefined。受付IDを含むObject。詳細は型定義を参照。
 */
export const sendOrder = async (productCode: string, params: SendOrderParams) => {

  // 引数チェックを軽く
  if (params.child_order_type === 'LIMIT' && params.price === undefined) {
    await handleError(__filename, 'sendOrder', 'code', 'countの範囲が不一致', { productCode, params, });
    return undefined;
  }

  try {
    const res = await sendRequest({
      uri: 'me/sendchildorder',
      body: { product_code: productCode, ...params },
      method: 'POST',
    }, true, true);
    if (!res) return undefined; // API通信でエラー、または200系でない。
    const json = await res.json();
    return json as SendOrderResult;
  } catch (err) {
    await handleError(__filename, 'sendOrder', 'code', 'API通信でエラー', { productCode, params, }, err);
    return undefined;
  }

};
