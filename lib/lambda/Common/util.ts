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
 * @param targetDate 判定対象の日付を設定する。日付はUTCとして解釈し、ローカライズされない。
 * @param cron 条件を表すCronを指定する。各項目は、省略すると条件に含めない。例：cron = {hour: {rep: false, target: 17}, date: {rep: true, target: 5}}は、2000-1-5 17:00:00, 2000-1-10 17:00:00, 2000-1-15 17:00:00, ...等に実行する。
 */
export const matchCron = (targetDate: Date, cron: Cron) => {

  if (cron.minute && !matchCronItem(targetDate.getUTCMinutes(), cron.minute)) return false;
  if (cron.hour && !matchCronItem(targetDate.getUTCHours(), cron.hour)) return false;
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

export const convertStringToDate = (value: string) => {
  return new Date(Date.parse(value));
};

/**
 * 指定した値が整数であるかチェックする。
 * @returns 値がundefinedである、または、値が整数である。
 */
export const isInteger = (value?: number) => {
  return value === undefined || Number.isInteger(value);
}

export const isAllInteger = (...values: (number | undefined)[]) => {
  for (let value of values) {
    if (!isInteger(value)) return false;
  }
  return true;
}

export const asyncExecution = async (...executions: (() => Promise<void>)[]) => {
  const promiseList: Promise<void>[] = [];
  for (let execution of executions) promiseList.push(execution());
  return await Promise.all(promiseList);
};

/**
 * 数値を特定の桁数で切り捨て、または四捨五入する。
 * 例えば、moveUp(1.23456789, 0, 'floor') => 1, moveUp(1.23456789, 3, 'floor') => 1.234, moveUp(1.23456789, 5, 'floor') => 1.23456。
 * @param value 対象の数値。
 * @param digits 対象の桁数。
 * @param operation floorまたはround。切り捨てるか、四捨五入するか。
 */
export const moveUp = (value: number, digits: number, operation: 'floor' | 'round') => {

  const base = Math.pow(10, digits);
  if (operation === 'floor') {
    return Math.floor(value * base) / base;
  } else {
    return Math.round(value * base) / base;
  }

};

export const sleep = (milliseconds: number) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => { resolve(undefined); }, milliseconds);
  });
}

/**
 * 特定の非同期関数を、指定のミリ秒かけて実行する。
 * 実行時間が指定したミリ秒を超えている場合は、実行が完了した後そのままリターンする。
 * 実行時間が指定したミリ秒未満の場合は、ミリ秒経過するまで待機する。
 * @param executor 実行したい非同期処理
 * @param milliseconds 待機する時間
 * @returns 実行結果
 */
export const executeAsyncInMilliseconds = async <T>(executor: () => Promise<T>, milliseconds: number,): Promise<T> => {
  const result = await Promise.all([executor(), sleep(milliseconds)]);
  return result[0];
};
