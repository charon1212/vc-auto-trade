import { getExecutions } from "../Bitflyer/getExecutions";
import { setExecution } from "../Dynamodb/execution";

export type ExecutionItem = {
  timestamp: number,
  price: number,
  sellSize: number,
  buySize: number,
  totalSize: number,
}

const saveExecutionHistory = async (productCode: string, date: Date) => {

  const executionList = await getExecutions(productCode, 300);
  if (!executionList) return;

  // 10秒ごとに区切る。
  let saveData: ExecutionItem[] = [];
  for (let i = 0; i < 6; i++) saveData.push({
    timestamp: (getTotalMinute(date) * 60 + i * 10) * 1000,
    price: 0,
    sellSize: 0,
    buySize: 0,
    totalSize: 0,
  });

  for (let execution of executionList) {
    if (matchMinute(date, execution.exec_date)) {
      const second = execution.exec_date.getSeconds();
      const index = Math.floor(second / 10);
      saveData[index].price += execution.price * execution.size;
      if (execution.side === 'BUY') {
        saveData[index].buySize += execution.size;
      } else if (execution.side === 'SELL') {
        saveData[index].sellSize += execution.size;
      }
      saveData[index].totalSize += execution.size;
    }
  }

  // 価格を平均価格にする。
  for (let data of saveData) {
    if (data.totalSize) data.price = data.price / data.totalSize;
  }

  const sortKey = (getTotalMinute(date) * 60 * 1000).toString();

  await setExecution(productCode, sortKey, saveData);

};

/**
 * 2つの日付に対し、年月日・時分が一致しているかどうかを返す。
 */
const matchMinute = (d1: Date, d2: Date) => {
  return getTotalMinute(d1) === getTotalMinute(d2);
};
const getTotalMinute = (d: Date) => {
  return Math.floor(d.getTime() / (1000 * 60));
};

export default saveExecutionHistory;