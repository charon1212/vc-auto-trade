import { deleteExecution, ExecutionDynamoDB, searchExecutions } from "./Interfaces/AWS/Dynamodb/execution";
import { writeTextFile } from "./Interfaces/AWS/S3/writeTextFile";
import { productSettings } from "./Main/productSettings";

/**
 * target: 指定した日付を狙い撃ちしてデータ移行する場合は、その年月日を指定する。
 * また、monthは0から始まる整数で指定する。それ以外は1から始まる整数で指定する。
 */
type handlerEvent = {
  target?: {
    year: number, month: number, date: number,
  }
};

exports.handler = async function (event?: handlerEvent) {

  const targetDate = event?.target ? new Date(event.target.year, event.target.month, event.target.date,) : getYeasterday();
  // 重ければ非同期処理を並列実行させる。今は直列実行（めんどいし、Dailyバッチで速度が必要ないため）
  for (let productSetting of productSettings) {
    await exec(productSetting.productCode, targetDate);
  }
  return '';

};

const getYeasterday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
};

/**
 * DynamoDBから集計対象日時のデータをすべて取得し、S3にCSV形式で保存する。
 * @param productCode プロダクトコード。
 * @param targetDate 集計対象の日時
 */
const exec = async (productCode: string, targetDate: Date) => {

  const startTimestamp = targetDate.getTime();
  const endTimestamp = startTimestamp + 24 * 60 * 60 * 1000 - 1;

  const res = await searchExecutions(productCode, startTimestamp.toString(), endTimestamp.toString());

  if (res?.count && res.count > 0) {
    const csvBody = makeCsvBody(res.result);
    const yearMonthStr = `${targetDate.getFullYear()}-${targetDate.getMonth() + 1}`;
    const yearMonthDayStr = yearMonthStr + `-${targetDate.getDate()}`;
    const csvFilePath = `EXEC_HISTORY_${productCode}_${yearMonthStr}/data_${yearMonthDayStr}.csv`;

    await writeTextFile(csvFilePath, csvBody);

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