import { getProductSetting, ProductId } from "../../Main/productSettings";
import { ApiRequestEvent, ApiResponse, } from './type';

export const getProductSettingFromRequestEvent = (event: ApiRequestEvent) => {
  const productId = event.pathParameters.productId as ProductId;
  return getProductSetting(productId);
};

export const makeRequestResponse = (statusCode: number, body: Object): ApiResponse => {
  return {
    isBase64Encoded: false,
    statusCode: statusCode,
    headers: {},
    body: JSON.stringify(body),
  }
};

export const make404Response = (errorMessage: string): ApiResponse => {
  return makeRequestResponse(404, {
    errorMessage,
  });
}
