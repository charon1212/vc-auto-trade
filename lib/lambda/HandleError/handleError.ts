import { appLogger } from "../Common/log";
import { sendSlackMessage } from "../Interfaces/Slack/sendSlackMessage";

/**
 * エラーハンドリング
 * @param filePath 呼び出し元のファイルパス
 * @param methodName 呼び出し元のメソッド名
 * @param code エラーコード。
 * @param msg エラーメッセージ
 * @param args 呼び出し元のメソッドの引数
 * @param err try-catchで発生したエラーの場合、スローした例外。
 */
const handleError = async (filePath: string, methodName: string, code?: string, msg?: string, args?: object, err?: any) => {

  let output = `${methodName}でエラー\r\n`;
  output += `■ファイルパス：${filePath}\r\n`;
  if (msg) output += `■メッセージ：${msg}\r\n`;
  if (args) output += `■引数：${JSON.stringify(args)}\r\n`;
  if (err) {
    output += `■エラー内容：${JSON.stringify({ message: err.message, trace: err.trace, err, })}`;
  };
  appLogger.error(output);
  await sendSlackMessage(output, true);

};

export default handleError;