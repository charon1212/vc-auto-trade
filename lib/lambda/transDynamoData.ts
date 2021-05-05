import { productCodeXRP } from "./const";
import { deleteExecution, ExecutionDynamoDB, searchExecutions } from "./Dynamodb/execution";
import { writeTextFile } from "./S3/writeTextFile";

exports.handler = async function (event: any) {

  const now = new Date();
  await exec(productCodeXRP, now.getFullYear(), now.getMonth(), now.getDate());

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
    const csvFilePath = `EXEC_HISTORY_${yearMonthStr}/data_${yearMonthDayStr}.csv`;

    await writeTextFile(csvFilePath, csvBody);

    for (let item of res.result) {
      // 怖いので、書き込みがうまくいっていることが分かるまでは消さない。
      // await deleteExecution(productCode, item.SortKey);
    }
  }

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