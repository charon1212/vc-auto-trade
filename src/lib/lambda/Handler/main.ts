import { processEnv } from '../Common/processEnv';
import { matchCron } from '../Common/util';
import handleError from '../HandleError/handleError';
import { sendSlackMessage } from '../Interfaces/Slack/sendSlackMessage';
import { entry } from '../Main/entry';

exports.handler = async function (event: any) {

  try {
    const cron = {
      dayOfWeek: { rep: false, value: 1 },
      hour: { rep: false, value: 0 },
      minute: { rep: false, value: 0 },
    }; // 毎週日曜の9:00:00 (日本時間)
    if (matchCron(new Date, cron)) {
      await sendSlackMessage(`test message(error). env=${processEnv.EnvName}`, true);
      await sendSlackMessage(`test message(info). env=${processEnv.EnvName}`, false);
    }
    const res = await entry();
    return res;
  } catch (err: any) {
    const stack = err?.stack;
    await handleError(__filename, 'handler', 'code', `実行エラーをトップレベルのハンドラーで確認。スタックトレース：${stack}`, { event }, err);
    throw err;
  }

};