import { appLogger } from "../../Common/log";
import { searchDynamoDbLast } from "../../Interfaces/AWS/Dynamodb/db"
import { dbSettingLambdaExecutionLive } from "../../Interfaces/AWS/Dynamodb/dbSettings";
import { ApiRequestEvent, ApiResponse } from "./type";
import { getProductSettingFromRequestEvent, makeErrorResponse, makeRequestResponse } from "./util"

exports.handler = async function (event: ApiRequestEvent): Promise<ApiResponse> {

  appLogger.info1(`▼▼ApiRequestReceivedGetLive-${JSON.stringify({ event })}`);
  const result = await getLive(event);
  appLogger.info1(`▼▼ApiRequestResponseGetLive-${JSON.stringify({ result })}`);
  return result;

}

const getLive = async (event: ApiRequestEvent) => {
  const productSetting = getProductSettingFromRequestEvent(event);
  if (!productSetting) {
    return makeErrorResponse(404, 'ProductIdが見つからない');
  }
  const lastLiveData = await searchDynamoDbLast(productSetting, dbSettingLambdaExecutionLive);
  appLogger.info1(`▼▼▼GetLiveResult-${JSON.stringify({ lastLiveData })}`);
  if (lastLiveData?.items[0]) {
    const data = lastLiveData.items[0];
    return makeRequestResponse(200, {
      live: data,
    });
  }
  return makeErrorResponse(404, '死活データの取得に失敗');
};
