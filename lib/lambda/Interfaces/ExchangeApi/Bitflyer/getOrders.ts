import { appLogger } from "../../../Common/log";
import { convertStringToDate, isAllInteger, } from "../../../Common/util";
import handleError from "../../../HandleError/handleError";
import { sendRequest } from "./apiRequest";
import { Pagination } from "./type";
import { convertPaginationToString } from './util';

type OrderBitflyer = {
  id: number, // ページング用の通し番号
  child_order_id: string, // 注文の一意なID
  product_code: string, // 注文の対象暗号通貨を表す製品コード
  side: 'BUY' | 'SELL', // 売り注文・買い注文
  child_order_type: 'LIMIT' | 'MARKET', // 指値・成行
  price?: number, // 指値の対象価格
  average_price: number, // 約定価格？
  size: number, // 取引量
  child_order_state: 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'REJECTED' | 'COMPLETED', // 注文の状態。
  expire_date: Date, // 有効期限
  child_order_date: Date, // 注文を発行した日時？
  child_order_acceptance_id: string, // 注文受付ID
  outstanding_size: number, // ?
  cancel_size: number, // キャンセルした量
  executed_size: number, // 約定した量
  total_commission: number, // ?
};

type GetOrderParams = {
  child_order_state?: string,
  child_order_id?: string,
  child_order_acceptance_id?: string,
  parent_order_id?: string,
};

export const getOrders = async (productCode: string, params?: GetOrderParams, pagination?: Pagination,) => {

  // 整数チェック
  if (!isAllInteger(pagination?.count, pagination?.before, pagination?.after)) {
    await handleError(__filename, 'getOrders', 'code', '整数以外の数値が指定されている', { productCode, params, pagination, });
    return [];
  }
  if (pagination?.count && (pagination.count < 1 || pagination.count > 500)) {
    await handleError(__filename, 'getOrders', 'code', 'countの範囲が不一致', { productCode, params, pagination, });
    return [];
  }

  try {
    const queryParams = { product_code: productCode, ...params, ...convertPaginationToString(pagination) };
    const res = await sendRequest({ uri: 'me/getchildorders', queryParams }, true);
    if (!res) return [];
    const json = await res.json();
    for (let exec of json) {
      // 日付を文字列からDateへ変換する。
      exec.exec_date = convertStringToDate(exec.exec_date);
    }
    appLogger.info(`apiGetData: ${JSON.stringify(json)}`);
    return json as OrderBitflyer[];
  } catch (err) {
    await handleError(__filename, 'getOrders', 'code', 'API通信でエラー', { productCode, params, pagination, });
    return [];
  }

};
