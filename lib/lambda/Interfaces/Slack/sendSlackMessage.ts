import fetch from "node-fetch";
import { slackUrlBase } from "../../Common/const";
import { appLogger } from "../../Common/log";
import { processEnv } from "../../Common/processEnv";

export const sendSlackMessage = async (text: string, postToErrorChannel: boolean) => {

  const token = processEnv.slackBotToken;
  const channel = postToErrorChannel ? processEnv.slackChannelError : processEnv.slackChannelInfo;

  const url = slackUrlBase + 'chat.postMessage';
  const method = 'POST';
  const headers = {
    'content-type': 'application/json; charset=UTF-8',
    'authorization': 'Bearer ' + token,
  };
  const body = {channel, text};

  const params = {url, method, headers, body};
  appLogger.info(`sendRequest: ■params=${JSON.stringify(params)}`);

  const res = await fetch(url, {
    method,
    body: JSON.stringify(body),
    headers,
  });
  return res;

};