import { appLogger } from "../../Common/log";
import { isNumber, isString } from "../../Common/util";
import { OrderPhase, VCATProductContext } from "../../Interfaces/DomainType";
import { getProductContext, importProductContextFromDb, saveProductContext } from "../../Main/context";
import { ApiRequestEvent, ApiResponse } from "./type";
import { getProductSettingFromRequestEvent, makeErrorResponse, makeRequestResponse } from "./util"

type PatchContextBody = {
  orderPhase?: any,
  afterSendOrder?: any,
  orderId?: any,
  buyOrderPrice?: any,
  startBuyTimestamp?: any,
  executePhase?: any,
  executeMain?: any,
  makeNewOrder?: any,
};

exports.handler = async function (event: ApiRequestEvent): Promise<ApiResponse> {

  appLogger.info1(`▼▼ApiRequestReceivedPatchContext-${JSON.stringify({ event })}`);
  const result = await patchContext(event);
  appLogger.info1(`▼▼ApiRequestResponsePatchContext-${JSON.stringify({ result })}`);
  return result;

}

const patchContext = async (event: ApiRequestEvent): Promise<ApiResponse> => {
  const productSetting = getProductSettingFromRequestEvent(event);
  if (!productSetting) return makeErrorResponse(404, 'ProductIdが見つからない');

  const jsonStr = event.body;
  let json: PatchContextBody;
  try {
    json = JSON.parse(jsonStr);
  } catch (err) {
    return makeErrorResponse(400, 'ボディがJSONでない');
  }

  await importProductContextFromDb();
  const context = await getProductContext(productSetting.id);
  if (!context) return makeErrorResponse(404, 'プロダクトコンテキストが見つからない');

  changeContext(context, json);

  await saveProductContext();

  return makeRequestResponse(200, context);
};

const changeContext = (context: VCATProductContext, json: any) => {
  if (json.orderPhase === 'undefined') context.orderPhase = undefined;
  if (json.orderPhase === 'Buy') context.orderPhase = 'Buy';
  if (json.orderPhase === 'Sell') context.orderPhase = 'Sell';
  if (json.orderPhase === 'StopLoss') context.orderPhase = 'StopLoss';
  if (json.orderPhase === 'Wait') context.orderPhase = 'Wait';

  if (json.afterSendOrder === 'undefined') context.afterSendOrder = undefined;
  if (json.afterSendOrder === true) context.afterSendOrder = true;
  if (json.afterSendOrder === false) context.afterSendOrder = false;

  if (isString(json.orderId)) {
    if (json.orderId === 'undefined') context.orderId = undefined;
    context.orderId = json.orderId;
  }

  if (json.buyOrderPrice === 'undefined') context.buyOrderPrice = undefined;
  if (isNumber(json.buyOrderPrice)) context.buyOrderPrice = json.buyOrderPrice;

  if (json.startBuyTimestamp === 'undefined') context.startBuyTimestamp = undefined;
  if (isNumber(json.startBuyTimestamp)) context.startBuyTimestamp = json.startBuyTimestamp;

  if (!context.executionSetting) context.executionSetting = {};
  if (json.executePhase === 'undefined') context.executionSetting.executePhase = undefined;
  if (json.executePhase === true) context.executionSetting.executePhase = true;
  if (json.executePhase === false) context.executionSetting.executePhase = false;
  if (json.executeMain === 'undefined') context.executionSetting.executeMain = undefined;
  if (json.executeMain === true) context.executionSetting.executeMain = true;
  if (json.executeMain === false) context.executionSetting.executeMain = false;
  if (json.makeNewOrder === 'undefined') context.executionSetting.makeNewOrder = undefined;
  if (json.makeNewOrder === true) context.executionSetting.makeNewOrder = true;
  if (json.makeNewOrder === false) context.executionSetting.makeNewOrder = false;
};
