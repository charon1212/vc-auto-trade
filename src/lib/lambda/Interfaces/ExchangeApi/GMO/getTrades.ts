import { convertStringToDate } from "../../../Common/util";
import handleError from "../../../HandleError/handleError";
import { ProductCode } from "../../../Main/productSettings";
import { sendRequest } from "./apiRequest";
import { hasNanAttributeList, } from "./util";

export type TradeGMO = {
  side: 'BUY' | 'SELL', // 買い注文と売り注文のどちらで成立したか表す。板寄せで決まると空文字になりうる？
  price: number, // 約定価格
  size: number, // 約定量
  timestamp: Date, // 約定日時
}

export const getTrades = async (symbol: ProductCode, page?: number, count?: number,) => {
  try {
    const res = await sendRequest({
      uri: '/v1/trades',
      queryParams: {
        symbol,
        page: page?.toString(),
        count: count?.toString(),
      },
      method: 'GET',
    }, false, true, true);
    if (!res) return []; // API通信でエラー、または200系でない。

    const trades = res.json.data.list;
    const convertedTrades = trades.map((trade: any) => ({
      ...trade,
      price: +trade.price,
      size: +trade.size,
      timestamp: convertStringToDate(trade.timestamp),
    })) as TradeGMO[];
    if (hasNanAttributeList(convertedTrades)) throw new Error('数値変換に失敗');
    return convertedTrades;

  } catch (err) {
    await handleError(__filename, 'getTrades', 'code', 'API通信でエラー', { symbol, page, count, }, err);
    return [];
  }
}