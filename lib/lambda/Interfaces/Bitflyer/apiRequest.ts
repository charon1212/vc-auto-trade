import fetch from "node-fetch";
import { urlBase } from "../../Common/const";
import { appLogger } from "../../Common/log";

export const sendRequest = async (params: { uri: string, method?: string, body?: object, headers?: { [key: string]: string }, queryParams?: { [key: string]: string | undefined } }) => {

  const { uri, method, body, headers, queryParams } = params;
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