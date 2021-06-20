import { appLogger } from "../../Common/log";
import { getDynamoDb, } from "../../Interfaces/AWS/Dynamodb/db"
import { dbSettingProductContext, sortKeyContext } from "../../Interfaces/AWS/Dynamodb/dbSettings";
import { ApiRequestEvent, ApiResponse } from "./type";
import { getProductSettingFromRequestEvent, make404Response, makeRequestResponse } from "./util"

exports.handler = async function (event: ApiRequestEvent): Promise<ApiResponse> {

  appLogger.info1(`▼▼ApiRequestReceivedGetContext-${JSON.stringify({ event })}`);
  const result = await getContext(event);
  appLogger.info1(`▼▼ApiRequestResponseGetContext-${JSON.stringify({ result })}`);
  return result;

}

const getContext = async (event: ApiRequestEvent) => {
  const productSetting = getProductSettingFromRequestEvent(event);
  if (!productSetting) return make404Response('ProductIdが見つからない');

  const context = await getDynamoDb(productSetting, dbSettingProductContext, sortKeyContext);
  appLogger.info1(`▼▼▼GetContextResult-${JSON.stringify({ context })}`);
  if (context) {
    return makeRequestResponse(200, { context, });
  } else {
    return make404Response('死活データの取得に失敗');
  }
};
