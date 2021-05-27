import { convertStringToDate, isAllInteger } from "../../../Common/util";
import handleError from "../../../HandleError/handleError";
import { Pagination } from "./type";
import { convertPaginationToString } from "./util";
import { sendRequest } from "./apiRequest";
import { appLogger } from "../../../Common/log";

export type ParentOrderStateBitflyer = 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'REJECTED' | 'COMPLETED';

export type ParentOrderBitflyer = {
  id: number, // ページング用の通し番号
  parent_order_id: string, // 注文の一意なID
  product_code: string, // 注文の対象暗号通貨を表す製品コード
  side: 'BUY' | 'SELL', // 売り注文・買い注文
  parent_order_type: 'LIMIT' | 'MARKET', // 指値・成行
  price?: number, // 指値の対象価格
  average_price: number, // 約定価格？
  size: number, // 取引量
  parent_order_state: ParentOrderStateBitflyer, // 注文の状態。
  expire_date: Date, // 有効期限
  parent_order_date: Date, // 注文を発行した日時？
  parent_order_acceptance_id: string, // 注文受付ID
  outstanding_size: number, // ?
  cancel_size: number, // キャンセルした量
  executed_size: number, // 約定した量
  total_commission: number, // ?
};

export type GetParentOrderParams = {
  parent_order_state?: ParentOrderStateBitflyer, // parent_order_state がその値に一致する注文のみを返す。
};

/**
 * 親注文の一覧を取得する
 * @param productCode プロダクトコード。
 * @param params クエリパラメータ。詳細は型定義を参照。
 * @param pagination ページング用パラメータ。
 * @returns 注文のリスト。プロパティの意味は型定義を参照。
 * @returns 
 */
export const getParentOrders = async (productCode: string, params?: GetParentOrderParams, pagination?: Pagination,) => {

  // 整数チェック
  if (!isAllInteger(pagination?.count, pagination?.before, pagination?.after)) {
    await handleError(__filename, 'getParentOrders', 'code', '整数以外の数値が指定されている', { productCode, params, pagination, });
    return [];
  }
  if (pagination?.count && (pagination.count < 1 || pagination.count > 500)) {
    await handleError(__filename, 'getParentOrders', 'code', 'countの範囲が不一致', { productCode, params, pagination, });
    return [];
  }

  try {
    const queryParams = { product_code: productCode, ...params, ...convertPaginationToString(pagination) };
    const res = await sendRequest({ uri: 'me/getparentorders', method: 'GET', queryParams }, true, true);
    if (!res) return []; // API通信でエラー、または200系でない。

    const json = await res.json();
    for (let exec of json) {
      // 日付を文字列からDateへ変換する。
      exec.exec_date = convertStringToDate(exec.exec_date);
      exec.parent_order_date = convertStringToDate(exec.parent_order_date);
    }
    appLogger.info(`apiGetData: ${JSON.stringify(json)}`);
    return json as ParentOrderBitflyer[];
  } catch (err) {
    await handleError(__filename, 'getParentOrders', 'code', 'API通信でエラー', { productCode, params, pagination, }, err);
    return [];
  }

};
