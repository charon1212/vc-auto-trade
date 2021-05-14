import { deleteExecution, ExecutionDynamoDB, searchExecutions } from "./Interfaces/AWS/Dynamodb/execution";
import { writeTextFile } from "./Interfaces/AWS/S3/writeTextFile";
import { productSettings } from "./Main/productSettings";

/**
 * target: 指定した日付を狙い撃ちしてデータ移行する場合は、その年月日を指定する。ただし、2日後の値を指定する必要がある。
 * また、monthは0から始まる整数で指定する。それ以外は1から始まる整数で指定する。
 */
type handlerEvent = {
  target?: {
    year: number, month: number, date: number,
  }
};

exports.handler = async function (event: handlerEvent) {

  const now = new Date();
  const targetDate = event.target;

  const { year, month, date } = targetDate || { year: now.getFullYear(), month: now.getMonth(), date: now.getDate() };

  // 重ければ非同期処理を並列実行させる。今は直列実行（めんどいし、Dailyバッチで速度が必要ないため）
  for (let productSetting of productSettings) {
    await exec(productSetting.productCode, year, month, date);
  }

  return '';

};

/**
 * DynamoDBから実行日付の2日前のデータをすべて取得し、S3にCSV形式で保存した後削除する。
 * @param productCode プロダクトコード。
 * @param year 実行時の年
 * @param month 実行時の月(0スタート)
 * @param day 実行時の日
 */
const exec = async (productCode: string, year: number, month: number, day: number) => {

  const before2Day = new Date(year, month, day - 2);
  const startTimestamp = before2Day.getTime();
  const endTimestamp = startTimestamp + 24 * 60 * 60 * 1000 - 1;

  const res = await searchExecutions(productCode, startTimestamp.toString(), endTimestamp.toString());

  if (res?.count && res.count > 0) {
    const csvBody = makeCsvBody(res.result);
    const yearMonthStr = `${before2Day.getFullYear()}-${before2Day.getMonth() + 1}`;
    const yearMonthDayStr = yearMonthStr + `-${before2Day.getDate()}`;
    const csvFilePath = `EXEC_HISTORY_${productCode}_${yearMonthStr}/data_${yearMonthDayStr}.csv`;

    await writeTextFile(csvFilePath, csvBody);

    // 怖いので、書き込みがうまくいっていることが分かるまでは消さない。
    // await deleteAllExecution(productCode, res.result);

  }

};

const deleteAllExecution = async (productCode: string, list: ExecutionDynamoDB[]) => {
  const promiseList: Promise<boolean>[] = [];
  for (let item of list) {
    promiseList.push(deleteExecution(productCode, item.SortKey));
  }
  return Promise.all(promiseList);
};

/**
 * DynamoDBのデータをもとにCSVファイルに出力する文字列を作成する。
 * @param list DynamoDBのデータ
 * @returns CSVファイルに出力する文字列
 */
const makeCsvBody = (list: ExecutionDynamoDB[]) => {
  const body: string[] = [];
  for (let item of list) {
    for (let item2 of item.ExecutionList) {
      body.push(`"${item2.timestamp}","${item2.price}","${item2.totalSize}","${item2.buySize}","${item2.sellSize}"`);
    }
  }
  return body.join('\r\n') + '\r\n';
}