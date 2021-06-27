import fetch from "node-fetch";
import { urlBaseBitflyer, urlBaseGmoPrivate, urlBaseGmoPublic } from "../../../Common/const";
import { appLogger } from "../../../Common/log";
import * as crypto from 'crypto';
import { processEnv } from "../../../Common/processEnv";
import handleError from "../../../HandleError/handleError";
import { convertQueryParamsToStr } from "../util";
import { getNowTimestamp } from "../../../Common/util";

export type RequestMethod = 'GET' | 'POST';
/**
 * GMO APIにリクエストを送信する。
 *
 * @param params.uri リソースURI。urlBaseで定義した"https://api.coin.z.com/public"以降の文字列。たぶん/v1/から始まる。
 * @param params.method GET, POST等のリクエストメソッド。
 * @param params.body リクエストボディ
 * @param params.headers リクエストヘッダ
 * @param params.queryParams クエリパラメータ
 * @param isPrivateHTTP PrivateHTTPAPIにアクセスする場合はtrue、そうでない場合はfalse。trueにすると、APIキーを使ってHeaderに認証情報を追加する。
 * @param handleNot2xxStatusAsError 200系以外のHTTPStatusをエラーとして扱う場合はtrue、そうでない場合はfalse。trueにすると、200系以外のステータスが来た場合はundefinedを返す。
 * @returns node-fetchのリクエストレスポンス。
 */
export const sendRequest = async (params: { uri: string, method: RequestMethod, body?: object, headers?: { [key: string]: string }, queryParams?: { [key: string]: string | undefined } }, isPrivateHTTP: boolean, handleNot2xxStatusAsError: boolean, handleStatusNotZeroAsError: boolean,) => {

  const { uri, method, body, queryParams } = params;
  let headers;
  let url = isPrivateHTTP ? urlBaseGmoPrivate : urlBaseGmoPublic;

  try {

    // uriを追加
    url += uri;
    // クエリパラメータをURLに登録
    url += convertQueryParamsToStr(queryParams);

    // ヘッダー取得処理
    const timestamp = getNowTimestamp();
    const additionalHeaders = isPrivateHTTP ? getPrivateApiRequestHeader(timestamp, params.method, uri, params.body) : {};
    headers = { ...additionalHeaders, ...params.headers };

    appLogger.info2(`★★API-GMO-REQUEST-${JSON.stringify({ params, url, method, headers, body, })}`);

  } catch (err) {
    await handleError(__filename, 'sendRequest', 'code', 'リクエスト前処理で失敗', { params, isPrivateHTTP, handleNot2xxStatusAsError, }, err);
    return undefined;
  }

  try {
    const res = await fetch(url, { method, body: JSON.stringify(body), headers, });

    if (handleNot2xxStatusAsError && !res.ok) {
      let json = '';
      try { json = await res.json(); } catch (err) { json = 'Bodyの取得に失敗' }; // res.jsonが取れるか不安なので。。。

      const message = `API通信で200系以外の応答。
■レスポンス情報::${JSON.stringify({ status: res.status, body: json })}`;
      await handleError(__filename, 'sendRequest', 'code', message, { params, isPrivateHTTP, handleNot2xxStatusAsError, },);
      return undefined;
    }

    const json = await res.json();
    const status = json.status;
    if(handleStatusNotZeroAsError && status !== 0){
      const message = `GMO-APIでステータスが正常(0)でない応答。詳細は下記のbody.messageを参照。
■レスポンス情報::${JSON.stringify({ status: res.status, body: json })}`;
      await handleError(__filename, 'sendRequest', 'code', message, { params, isPrivateHTTP, handleNot2xxStatusAsError, },);
      return undefined;
    }
    appLogger.info2(`★★API-GMO-RESPONSE-${JSON.stringify({ url, json, })}`);
    return { response: res, json, };
  } catch (err) {
    await handleError(__filename, 'sendRequest', 'code', 'API通信でエラー', { params, isPrivateHTTP, handleNot2xxStatusAsError, }, err);
    return undefined;
  }

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
export const getPrivateApiRequestHeader = (timestamp: number, method: string, path: string, body?: Object) => {

  const apiKey = processEnv.akeyGmo;
  const secretAccessKey = processEnv.skeyGmo;

  const text = timestamp.toString() + method + path + (body ? JSON.stringify(body) : '');
  const sign = crypto.createHmac('sha256', secretAccessKey).update(text).digest('hex');

  const headers = {
    'API-KEY': apiKey,
    'API-TIMESTAMP': timestamp.toString(),
    'API-SIGN': sign,
    'Content-Type': 'application/json',
  };

  return headers;

};
