import handleError from "../../../HandleError/handleError";
import { sendRequest } from "./apiRequest";
import { checkHttpStatus } from "./util";

type BalanceBitflyer = {
  currency_code: string,
  amount: number,
  available: number,
};

/**
 * 資産残高の一覧を取得する。
 * @returns 資産残高の一覧。
 */
export const getBalances = async () => {

  try {
    const res = await sendRequest({ uri: 'me/getbalance', method: 'GET' }, true);
    if (!res || !(await checkHttpStatus(res))) return []; // API通信でエラー、または200系でない。
    const json = await res.json();
    return json as BalanceBitflyer[];
  } catch (err) {
    await handleError(__filename, 'getBalances', 'code', 'API通信でエラー', {}, err);
    return [];
  };

};
