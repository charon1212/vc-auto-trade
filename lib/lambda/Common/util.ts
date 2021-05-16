type Cron = {
  minute?: CronItem,
  hour?: CronItem,
  date?: CronItem,
  month?: CronItem, // 1から始まる月。
  dayOfWeek?: CronItem, // 日曜日は1、月曜日は2、...、土曜日は7。
};
type CronItem = {
  rep: boolean, // 繰り返しの場合はtrue、単一指定の場合はfalse。
  value: number, // 対象の数値
};

/**
 * [date]が[cron]に指定した日付を満たすことを確認する。
 * @param targetDate 判定対象の日付を取得する。
 * @param cron 条件を表すCronを指定する。各項目は、省略すると条件に含めない。例：cron = {hour: {rep: false, target: 17}, date: {rep: true, target: 5}}は、2000-1-5 17:00:00, 2000-1-10 17:00:00, 2000-1-15 17:00:00, ...等に実行する。
 */
export const matchCron = (targetDate: Date, cron: Cron) => {

  if (cron.minute && !matchCronItem(targetDate.getUTCMinutes(), cron.minute)) return false;
  if (cron.hour && !matchCronItem(targetDate.getUTCMinutes(), cron.hour)) return false;
  if (cron.date && !matchCronItem(targetDate.getUTCDate(), cron.date)) return false;
  if (cron.month && !matchCronItem(targetDate.getUTCMonth() + 1, cron.month)) return false;
  if (cron.dayOfWeek && !matchCronItem(targetDate.getUTCDay() + 1, cron.dayOfWeek)) return false;

  return true;

};

const matchCronItem = (targetValue: number, cronItem: CronItem) => {
  if (cronItem.rep) {
    if (targetValue % cronItem.value !== 0) return false;
  } else {
    if (targetValue !== cronItem.value) return false;
  }
  return true;
};
