import handleError from "../../../HandleError/handleError";
import { sendRequest } from "./apiRequest";

export type GetStatusResult = {
  status: 'MAINTENANCE' | 'PREOPEN' | 'OPEN';
};

export const getStatus = async () => {
  try {
    const res = await sendRequest({
      uri: '/v1/trades',
      method: 'GET',
    }, false, true, true);
    if (!res) return undefined; // API通信でエラー、または200系でない。
    const data = res.json.data as GetStatusResult;
    return data;
  } catch (err) {
    await handleError(__filename, 'getStatus', 'code', 'API通信でエラー', {}, err);
    return undefined;
  }
};