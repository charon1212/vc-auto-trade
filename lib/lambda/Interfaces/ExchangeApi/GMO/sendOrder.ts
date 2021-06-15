import handleError from "../../../HandleError/handleError";
import { sendRequest } from "./apiRequest";
import { hasNanAttribute, } from "./util";

type Symbol = 'BTC' | 'ETH' | 'BCH' | 'LTC' | 'XRP' | 'BTC_JPY' | 'ETH_JPY' | 'BCH_JPY' | 'LTC_JPY' | 'XRP_JPY';
type Side = 'BUY' | 'SELL';
type ExecutionType = 'MARKET' | 'LIMIT' | 'STOP';
type TimeInForce = 'FAK' | 'FAS' | 'SOK';
export type SendOrderParams = {
  symbol: Symbol,
  side: Side,
  executionType: ExecutionType,
  timeInForce?: TimeInForce,
  price?: number,
  losscutPrice?: number,
  size: number,
  cancelBefore?: string,
};
export type SendOrderResult = {
  data: number,
};

export const sendOrder = async (params: SendOrderParams) => {

  try {
    const res = await sendRequest({
      uri: '/v1/order',
      body: {
        ...params,
        price: params.price && params.price.toString(),
        losscutPrice: params.losscutPrice && params.losscutPrice.toString(),
        size: params.size && params.size.toString(),
      },
      method: 'POST',
    }, true, true);
    if (!res) return undefined; // API通信でエラー、または200系でない。
    const convertedResult = { data: +res.json.data };
    if (hasNanAttribute(convertedResult)) throw new Error('数値変換に失敗。');
    return convertedResult as SendOrderResult;
  } catch (err) {
    await handleError(__filename, 'sendOrder', 'code', 'API通信でエラー', { params, }, err);
    return undefined;
  }

};
