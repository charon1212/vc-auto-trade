import fetch from 'node-fetch';
import { urlBase } from '../../const';
import handleError from '../../HandleError/handleError';

export type ExecutionBitflyer = {
  id: number,
  side: 'BUY' | 'SELL' | '',
  price: number,
  size: number,
  exec_date: Date,
  buy_child_order_acceptance_id: string,
  sell_child_order_acceptance_id: string,
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
export const getExecutions = async (productCode: string, count: number, before?: number, after?: number) => {

  count = Math.floor(count);
  if (count < 1 || count > 500) {
    handleError('', 'getExecutions::countの範囲が不一致');
    return [];
  }

  let url = urlBase + `executions?product_code=${productCode}&count=${count}`;
  if (before !== undefined) url += `&before=${before}`;
  if (after !== undefined) url += `&after=${after}`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    for (let exec of json) {
      // 日付を文字列からDateへ変換する。
      exec.exec_date = convert(exec.exec_date);
    }
    return json as ExecutionBitflyer[];
  } catch (e) {
    handleError('', `API通信でエラー：${JSON.stringify(e)}`);
    return [];
  }

};

const convert = (value: string) => {
  return new Date(Date.parse(value));
};