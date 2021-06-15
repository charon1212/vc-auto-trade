import { appLogger } from '../../../Common/log';
import { convertStringToDate } from '../../../Common/util';
import handleError from '../../../HandleError/handleError';
import { ProductCode } from '../../../Main/productSettings';
import { sendRequest } from './apiRequest';

export type ExecutionBitflyer = {
  id: number, // 全約定履歴の通し番号
  side: 'BUY' | 'SELL' | '', // 買い注文と売り注文のどちらで成立したか表す。板寄せで決まると空文字になりうる。
  price: number, // 約定価格
  size: number, // 約定量
  exec_date: Date, // 約定日時
  buy_child_order_acceptance_id: string, // 約定の買い注文側の受付ID
  sell_child_order_acceptance_id: string, // 約定の売り注文側の受付ID
}

/**
 * 約定履歴を取得する。
 *
 * @param productCode 製品コード
 * @param count 数値。1～500を指定。
 * @param before IDの最大値。検索結果はこの値を含まない。
 * @param after IDの最小値。検索結果はこの値を含まない。
 * @returns 取得した約定履歴。エラー時は空配列。
 */
export const getExecutions = async (productCode: ProductCode, count: number, before?: number, after?: number) => {

  count = Math.floor(count);
  if (count < 1 || count > 500) {
    await handleError(__filename, 'getExecutions', 'code', 'countの範囲が不一致', { productCode, count, before, after });
    return [];
  }

  try {
    const res = await sendRequest({
      uri: 'executions',
      queryParams: {
        product_code: productCode,
        count: count.toString(),
        before: before?.toString(),
        after: after?.toString(),
      },
      method: 'GET',
    }, false, true);
    if (!res) return []; // API通信でエラー、または200系でない。

    const json = res.json;
    for (let exec of json) {
      // 日付を文字列からDateへ変換する。
      exec.exec_date = convertStringToDate(exec.exec_date);
    }
    return json as ExecutionBitflyer[];
  } catch (err) {
    await handleError(__filename, 'getExecutions', 'code', 'API通信でエラー', { productCode, count, before, after }, err);
    return [];
  }

};
