import handleError from "../../../HandleError/handleError";
import { sendRequest } from "./apiRequest";

export type ParentOrderMethodBitflyer = 'SIMPLE' | 'IFD' | 'OCO' | 'IFDOCO';
export type ParentOrderTimeInForce = 'GTC' | 'IOC' | 'FOK';
export type ChildOrderConditionType = 'LIMIT' | 'MARKET' | 'STOP' | 'STOP_LIMIT' | 'TRAIL';

export type SendParentOrderParams = {
  order_method: ParentOrderMethodBitflyer, // 注文方法
  minute_to_expire?: number, // 有効期限(分単位)。省略した場合は43200(30日間)
  time_in_force?: ParentOrderTimeInForce, // 執行数量条件
  parameters: { // SIMPLE→1個、 IFD,OCO→2個、 IFDOCO→3個必要
    product_code: string, // プロダクトコード
    condition_type: ChildOrderConditionType, // 執行条件
    side: 'BUY' | 'SELL', // 売り・買い注文
    size: number, // 注文数量
    price?: number, // 価格。LIMIT, STOP_LIMITの場合は必要。
    trigger_price?: number, // ストップ注文のトリガー価格。STOP, STOP_LIMITの場合は必要。
    offset?: number, // トレール幅。正の整数。TRAILの場合は必要。
  }[],
};

export type SendParentOrderResult = {
  parent_order_acceptance_id: string, // 親注文の受付ID。
};

/**
 * 新規の親注文を出す。
 * @param params Bodyパラメータ。詳細は型定義を参照。
 * @returns エラー時はundefined。受付IDを含むObject。詳細は型定義を参照。
 */
export const sendParentOrder = async (params: SendParentOrderParams) => {

  // 簡単な引数チェック
  if (!(await checkSendParentOrderParams(params))) return undefined;

  try {
    const res = await sendRequest({
      uri: 'me/sendparentorder',
      body: { ...params },
      method: 'POST',
    }, true, true);
    if (!res) return undefined;
    const json = await res.json();
    return json as SendParentOrderResult;
  } catch (err) {
    await handleError(__filename, 'sendParentOrder', 'code', 'API通信でエラー', { params, }, err);
    return undefined;
  }

};

/**
 * 引数チェック
 * @param params 
 * @returns 
 */
const checkSendParentOrderParams = async (params: SendParentOrderParams) => {

  if (params.order_method === 'SIMPLE' && params.parameters.length !== 1) {
    await handleError(__filename, 'checkSendParentOrderParams', 'code', 'SIMPLE注文のparametersは配列長1にする必要があります。', { params, },);
    return false;
  } else if ((params.order_method === 'IFD' || params.order_method === 'OCO') && params.parameters.length !== 2) {
    await handleError(__filename, 'checkSendParentOrderParams', 'code', 'IFD注文またはOCO注文のparametersは配列長2にする必要があります。', { params, },);
    return false;
  } else if (params.order_method === 'IFDOCO' && params.parameters.length !== 3) {
    await handleError(__filename, 'checkSendParentOrderParams', 'code', 'IFDOCO注文のparametersは配列長3にする必要があります。', { params, },);
    return false;
  }

  for (let parameter of params.parameters) {
    if ((parameter.condition_type === 'LIMIT' || parameter.condition_type === 'STOP_LIMIT') && !parameter.price) {
      await handleError(__filename, 'checkSendParentOrderParams', 'code', 'LIMIT注文、または、STOP_LIMIT注文では、priceは必須です。', { params, },);
      return false;
    } else if ((parameter.condition_type === 'STOP' || parameter.condition_type === 'STOP_LIMIT') && !parameter.trigger_price) {
      await handleError(__filename, 'checkSendParentOrderParams', 'code', 'STOP注文、または、STOP_LIMIT注文では、trigger_priceは必須です。', { params, },);
      return false;
    } else if (parameter.condition_type === 'TRAIL' && !parameter.offset) {
      await handleError(__filename, 'checkSendParentOrderParams', 'code', 'TRAIL注文では、offsetは必須です。', { params, },);
      return false;
    }
  }

  return true;

};
