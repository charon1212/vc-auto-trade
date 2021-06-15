import { convertStringToDate } from "../../../Common/util";
import handleError from "../../../HandleError/handleError";
import { sendRequest } from "./apiRequest";
import { hasNanAttributeList } from "./util";

type Symbol = 'BTC' | 'ETH' | 'BCH' | 'LTC' | 'XRP' | 'BTC_JPY' | 'ETH_JPY' | 'BCH_JPY' | 'LTC_JPY' | 'XRP_JPY';
type Side = 'BUY' | 'SELL';
type ExecutionType = 'MARKET' | 'LIMIT' | 'STOP';
type SettleType = 'OPEN' | 'CLOSE';
export type OrderStatusGMO = 'WAITING' | 'ORDERED' | 'MODIFYING' | 'CANCELLING' | 'CANCELED' | 'EXECUTED' | 'EXPIRED';

export type OrderGMO = {
  rootOrderId: number, // 親注文ID
  orderId: number, // 注文ID
  symbol: Symbol, // 銘柄名
  side: Side, // 売買区分
  orderType: string, // 取引区分
  executionType: ExecutionType, // 注文タイプ
  settleType: SettleType, // 決算区分
  size: number, // 発注数量
  executedSize: number, // 約定数量
  price: number, // 注文価格
  losscutPrice: number, // ロスカットレート
  status: OrderStatusGMO, // 注文ステータス
  cancelType: string, // 取消区分
  timeInForce: string, // 執行数量条件
  timestamp: Date, // 注文日時
};

export const getOrders = async (orderIdList: string[]) => {

  if (orderIdList.length === 0) return [];
  try {
    const queryParams = { orderId: orderIdList.join(',') };
    const res = await sendRequest({ uri: '/v1/orders', method: 'GET', queryParams }, true, true);
    if (!res) return [];
    const json: any[] = res.json.data.list;
    const orders = json.map((order) => ({
      ...order,
      size: +order.size,
      executedSize: +order.executedSize,
      price: +order.price,
      losscutPrice: +order.losscutPrice,
      timestamp: convertStringToDate(order.timestamp),
    }));
    if (hasNanAttributeList(orders)) throw new Error('数値変換に失敗');
    return orders as OrderGMO[];
  } catch (err) {
    await handleError(__filename, 'getOrders', 'code', 'API通信でエラー', { orderIdList, }, err);
    return [];
  }

};