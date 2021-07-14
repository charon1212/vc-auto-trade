import { appLogger } from "../../Common/log";
import { executeAsyncInMilliseconds } from "../../Common/util";
import { ProductSetting } from "../../Main/productSettings";
import { getStatus } from "./GMO/getStatus";

export const getApiStatus = async (productSetting: ProductSetting) => {
  appLogger.info1(`★★API-getApiStatus-CALL`);
  let result: boolean = false;
  if (productSetting.exchangeCode === 'Bitflyer') {
    result = await getApiStatusBitflyer();
  } else if (productSetting.exchangeCode === 'GMO') {
    result = await getApiStatusGmo();
  }
  appLogger.info1(`★★API-getApiStatus-RESULT-${JSON.stringify({ result })}`);
  return result;
};

const getApiStatusGmo = async () => {
  const data = await executeAsyncInMilliseconds(async () => (await getStatus()), 500);
  return data?.status === 'OPEN';
};

// BitflyerのAPIは使わない方針なので、いったんfalse固定。
const getApiStatusBitflyer = async () => {
  return false;
};
