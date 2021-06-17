import handleError from "../../../HandleError/handleError";
import { sendRequest } from "./apiRequest";

export const cancelOrder = async (orderId: number,) => {

  try {
    const res = await sendRequest({
      uri: '/v1/cancelOrder',
      body: { orderId },
      method: 'POST',
    }, true, true, true);
    if (!res) return false;
    return true;
  } catch (err) {
    await handleError(__filename, 'sendOrder', 'code', 'API通信でエラー', { orderId, }, err);
    return false;
  }

};