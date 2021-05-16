import { processEnv } from './Common/processEnv';
import { matchCron } from './Common/util';
import { sendSlackMessage } from './Interfaces/Slack/sendSlackMessage';
import { entry } from './Main/entry';

exports.handler = async function (event: any) {

  const cron = {
    dayOfWeek: { rep: false, value: 1 },
    hour: { rep: false, value: 0 },
    minute: { rep: false, value: 0 },
  }; // 毎週日曜の9:00:00 (日本時間)
  if (matchCron(new Date, cron)) {
    sendSlackMessage(`test message(error). env=${processEnv.EnvName}`, true);
    sendSlackMessage(`test message(info). env=${processEnv.EnvName}`, false);
  }
  const res = await entry();
  return res;

};