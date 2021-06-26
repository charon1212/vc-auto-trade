import * as apiRequestModule from "../../lib/lambda/Interfaces/ExchangeApi/GMO/apiRequest";
import { AssetGMO } from "../../lib/lambda/Interfaces/ExchangeApi/GMO/getAssets";
import { GetExecutionResultGmo } from "../../lib/lambda/Interfaces/ExchangeApi/GMO/getExecutions";
import { OrderGMO } from "../../lib/lambda/Interfaces/ExchangeApi/GMO/getOrders";
import { TradeGMO } from "../../lib/lambda/Interfaces/ExchangeApi/GMO/getTrades";

type GmoApiMockGetDataList = {
  assets: AssetGMO[],
  executions: GetExecutionResultGmo[],
  orders: OrderGMO[],
  trades: TradeGMO[],
};

let apiGetDataList: GmoApiMockGetDataList;

export const mockGmoApi = (sourceData: GmoApiMockGetDataList) => {

  apiGetDataList = sourceData;
  const spyGmoApi = jest.spyOn(apiRequestModule, 'sendRequest').mockImplementation(
    async (...args) => (await mockImplSendApiRequest(...args))
  );
  return spyGmoApi;

};

const mockImplSendApiRequest = async (params: { uri: string, method: string, body?: object, headers?: { [key: string]: string }, queryParams?: { [key: string]: string | undefined } }, isPrivateHTTP: boolean, handleNot2xxStatusAsError: boolean, handleStatusNotZeroAsError: boolean,) => {

  if (params.uri === '/v1/account/assets' && params.method === 'GET') return mockImplGetAsset();
  if (params.uri === '/v1/executions' && params.method === 'GET') return mockImplGetExecutions(params.queryParams);
  if (params.uri === '/v1/orders' && params.method === 'GET') return mockImplGetOrders(params.queryParams);
  if (params.uri === '/v1/trades' && params.method === 'GET') return mockImplGetTrades(params.queryParams);
  if (params.uri === '/v1/order' && params.method === 'POST') return mockImplPostSendOrder();
  if (params.uri === '/v1/cancelOrder' && params.method === 'POST') return mockImplPostCancelOrder();

  throw new Error('実装していないURIが指定されました。');

};

const mockImplGetAsset = () => {
  return { response: undefined as any, json: apiGetDataList.assets };
};
const mockImplGetExecutions = (queryParams?: { [key: string]: string | undefined }) => {
  const orderId = queryParams?.orderId;
  const executionId = queryParams?.executionId;
  if (!orderId && !executionId) throw new Error('GetExecutionsではorderIdまたはexecutionIdのいずれかが必須です。');
  const result = apiGetDataList.executions.filter((item) => (item.orderId.toString() === orderId && item.executionId.toString() === executionId));
  return makeMockedReturnData(result);
};
const mockImplGetOrders = (queryParams?: { [key: string]: string | undefined }) => {
  const orderIdStr = queryParams?.orderId;
  if (!orderIdStr) return { response: undefined as any, json: [] };
  const orderIdList = orderIdStr.split(',').slice(0, 10);
  const result = orderIdList.map((orderId) => apiGetDataList.orders.find((item) => (item.orderId.toString() === orderId))).filter((item) => (item !== undefined)) as OrderGMO[];
  return makeMockedReturnData(result);
};
const mockImplGetTrades = (queryParams?: { [key: string]: string | undefined }) => {
  const symbol = queryParams?.symbol;
  const page = +(queryParams?.page || '1');
  const count = +(queryParams?.count || '100');
  if (!symbol) throw new Error('GetTradesでsymbolが指定されませんでした。');
  const start = (page - 1) * count;
  const end = page * count;
  const result = apiGetDataList.trades.slice(start, end);
  return makeMockedReturnData(result);
};
const mockImplPostSendOrder = (body?: Object) => {
  return makeMockedReturnData({ data: 12345 });
};
const mockImplPostCancelOrder = (body?: Object) => {
  return undefined;
};

const makeMockedReturnData = (json: any) => ({ response: undefined as any, json, });
