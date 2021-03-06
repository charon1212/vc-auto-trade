import { appLogger } from "../../../Common/log";
import { convertStringToDate, isAllInteger, } from "../../../Common/util";
import handleError from "../../../HandleError/handleError";
import { ProductCode } from "../../../Main/productSettings";
import { sendRequest } from "./apiRequest";
import { Pagination } from "./type";
import { convertPaginationToString, } from './util';

export type OrderStateBitflyer = 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'REJECTED' | 'COMPLETED';
export type OrderBitflyer = {
  id: number, // ページング用の通し番号
  child_order_id: string, // 注文の一意なID
  product_code: string, // 注文の対象暗号通貨を表す製品コード
  side: 'BUY' | 'SELL', // 売り注文・買い注文
  child_order_type: 'LIMIT' | 'MARKET', // 指値・成行
  price?: number, // 指値の対象価格
  average_price: number, // 約定価格？
  size: number, // 取引量
  child_order_state: OrderStateBitflyer, // 注文の状態。
  expire_date: Date, // 有効期限
  child_order_date: Date, // 注文を発行した日時？
  child_order_acceptance_id: string, // 注文受付ID
  outstanding_size: number, // ?
  cancel_size: number, // キャンセルした量
  executed_size: number, // 約定した量
  total_commission: number, // ?
};

export type GetOrderParams = {
  child_order_state?: OrderStateBitflyer, // child_order_state がその値に一致する注文のみを返す。
  child_order_id?: string, // 指定した ID に一致する注文を取得
  child_order_acceptance_id?: string, // 指定した ID に一致する注文を取得
  parent_order_id?: string, // 指定された場合、その親注文に関連付けられている注文の一覧を取得
};

/**
 * 注文の一覧を取得する
 * @param productCode プロダクトコード
 * @param params クエリパラメータ。詳細は型定義を参照。
 * @param pagination ページング用パラメータ。
 * @returns 注文のリスト。プロパティの意味は型定義を参照。
 * @remarks こちらも参照：https://lightning.bitflyer.com/docs?lang=ja#注文の一覧を取得
 */
export const getOrders = async (productCode: ProductCode, params?: GetOrderParams, pagination?: Pagination,) => {

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
    const res = await sendRequest({ uri: 'me/getchildorders', method: 'GET', queryParams }, true, true);
    if (!res) return []; // API通信でエラー、または200系でない。

    const json = res.json;
    for (let exec of json) {
      // 日付を文字列からDateへ変換する。
      exec.exec_date = convertStringToDate(exec.exec_date);
      exec.child_order_date = convertStringToDate(exec.child_order_date);
    }
    return json as OrderBitflyer[];
  } catch (err) {
    await handleError(__filename, 'getOrders', 'code', 'API通信でエラー', { productCode, params, pagination, }, err);
    return [];
  }

};
