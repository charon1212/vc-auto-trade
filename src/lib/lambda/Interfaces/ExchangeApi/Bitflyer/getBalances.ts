import handleError from "../../../HandleError/handleError";
import { sendRequest } from "./apiRequest";

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
    const res = await sendRequest({ uri: 'me/getbalance', method: 'GET' }, true, true);
    if (!res) return []; // API通信でエラー、または200系でない。
    return res.json as BalanceBitflyer[];
  } catch (err) {
    await handleError(__filename, 'getBalances', 'code', 'API通信でエラー', {}, err);
    return [];
  };

};
