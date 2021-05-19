import fetch from "node-fetch";
import { urlBase } from "../../Common/const";
import { appLogger } from "../../Common/log";
import * as crypto from 'crypto';
import { processEnv } from "../../Common/processEnv";

export const sendRequest = async (params: { uri: string, method?: string, body?: object, headers?: { [key: string]: string }, queryParams?: { [key: string]: string | undefined } }, isPrivateHTTP: boolean) => {

  const timestamp = Date.now();
  const additionalHeaders = isPrivateHTTP ? getPrivateApiRequestHeader(timestamp, params.method || '', params.uri, params.body || {}) : {};
  const headers = { ...additionalHeaders, ...params.headers };

  const { uri, method, body, queryParams } = params;
  let url = urlBase + uri;
  if (queryParams) {
    const queryParamSets: string[] = [];
    for (let key in queryParams) {
      if (queryParams[key] !== undefined) queryParamSets.push(key + '=' + queryParams[key]);
    }
    if (queryParamSets.length > 0) url += '?' + queryParamSets.join('&');
  }
  appLogger.info(`sendRequest: ■url=${url}, ■params=${JSON.stringify(params)}`);

  const res = await fetch(url, {
    method,
    body: JSON.stringify(body),
    headers,
  });
  return res;

};

/**
 * 認証情報を表すHTTPリクエストヘッダ。
 * cf: https://lightning.bitflyer.com/docs?lang=ja#%E8%AA%8D%E8%A8%BC
 *
 * @param timestamp Unix Timestamp。
 * @param method POST,GET 等のリクエストメソッド。
 * @param path /v1から始まるリクエストパス。「/v1/me/sendchildorder」等。
 * @param body リクエストボディ。
 */
export const getPrivateApiRequestHeader = (timestamp: number, method: string, path: string, body: Object) => {

  const apiKey = processEnv.AKEY;
  const secretAccessKey = processEnv.SKEY;

  const text = timestamp.toString() + method + path + JSON.stringify(body);
  const sign = crypto.createHmac('sha256', secretAccessKey).update(text).digest('hex');

  return {
    'ACCESS-KEY': apiKey,
    'ACCESS-TIMESTAMP': timestamp.toString(),
    'ACCESS-SIGN': sign,
    'Content-Type': 'application/json',
  };

};
