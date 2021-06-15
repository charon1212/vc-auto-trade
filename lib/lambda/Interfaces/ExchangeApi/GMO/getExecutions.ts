import { convertStringToDate } from "../../../Common/util";
import handleError from "../../../HandleError/handleError";
import { sendRequest } from "./apiRequest";
import { hasNanAttributeList } from "./util";



type Symbol = 'BTC' | 'ETH' | 'BCH' | 'LTC' | 'XRP' | 'BTC_JPY' | 'ETH_JPY' | 'BCH_JPY' | 'LTC_JPY' | 'XRP_JPY';
type Side = 'BUY' | 'SELL';
type SettleType = 'OPEN' | 'CLOSE';
export type GetExecutionResultGmo = {
  executionId: number,
  orderId: number,
  symbol: Symbol,
  side: Side,
  settleType: SettleType,
  size: number,
  price: number,
  lossGain: number,
  fee: number,
  timestamp: Date,
};

export const getExecutions = async (orderId?: number, executionId?: string,) => {
  try {
    const queryParams = { orderId: orderId?.toString(), executionId, };
    const res = await sendRequest({ uri: '/v1/executions', method: 'GET', queryParams }, true, true);
    if (!res) return [];
    const executions: any[] = (await res.json()).data.list;
    const convertedResult = executions.map((item) => ({
      ...item,
      executionId: +item.executionId,
      orderId: +item.orderId,
      size: +item.size,
      price: +item.price,
      lossGain: +item.lossGain,
      fee: +item.fee,
      timestamp: convertStringToDate(item.timestamp),
    }));
    if (hasNanAttributeList(convertedResult)) throw new Error('数値変換に失敗。');
    return convertedResult as GetExecutionResultGmo[];
  } catch (err) {
    await handleError(__filename, 'getExecutions', 'code', 'API通信でエラー', { orderId, }, err);
    return [];
  }
};