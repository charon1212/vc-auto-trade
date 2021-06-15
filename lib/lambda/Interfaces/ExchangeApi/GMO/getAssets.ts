import handleError from "../../../HandleError/handleError";
import { sendRequest } from "./apiRequest";
import { hasNanAttributeList } from "./util";

type AssetGMO = {
  amount: number,
  available: number,
  conversionRate: number,
  symbol: string,
};

/**
 * 資産残高の一覧を取得する。
 * @returns 資産残高の一覧。
 */
export const getAssets = async () => {

  try {
    const res = await sendRequest({ uri: '/v1/account/assets', method: 'GET' }, true, true);
    if (!res) return []; // API通信でエラー、または200系でない。
    const assets = (await res.json()).data;
    const convertedAssets = assets.map((asset: any) => ({
      ...asset,
      amount: +asset.amount,
      available: +asset.available,
      conversionRate: +asset.conversionRate,
    }));
    if (hasNanAttributeList(convertedAssets)) throw new Error('数値変換に失敗');
    return convertedAssets as AssetGMO[];
  } catch (err) {
    await handleError(__filename, 'getAssets', 'code', 'API通信でエラー', {}, err);
    return [];
  };

};
