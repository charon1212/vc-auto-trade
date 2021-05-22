import { setExecution } from "../../Interfaces/AWS/Dynamodb/execution";
import { getProductContext } from "../context";
import { Execution, ExecutionAggregated } from "../../Interfaces/DomainType";
import { getExecutions } from "../../Interfaces/ExchangeApi/getExecutions";

/**
 * 与えられた日時の1分間の約定履歴の情報を、DBに保存する。
 *
 * @param date 保存対象の日時。分までが有効で、それ以降は切り捨てる。「2000-01-01 12:34:56.789」が指定された場合、「2000-01-01 12:34:00」～「2000-01-01 12:34:59.999」の間のデータを保存する。
 */
const saveExecutionHistory = async (productCode: string, date: Date) => {

  const timestampByMinute = Math.floor(date.getTime() / (60 * 1000)) * 60 * 1000;
  const productContext = await getProductContext(productCode);
  const lastExecutionId = productContext.lastExecution?.id || undefined;

  // 取引所のAPIから約定履歴を時系列で取得する。
  const executionList = await getExecutions(timestampByMinute, productCode, lastExecutionId);

  // 取得した約定履歴を、10秒単位で集約する。
  const aggregateExecutionList = aggregateExecutions(executionList, timestampByMinute);

  // 集約した約定履歴をDBに保存する。
  await setExecution(productCode, timestampByMinute.toString(), aggregateExecutionList);

  // product context の last execution id を更新する。
  // 「timestampByMinute + 1分」よりも過去のデータで最新のデータを取得する。
  const lastDataBeforeTimestamp = executionList.find((item) => (item.executionDate.getTime() < timestampByMinute + 60 * 1000));
  if (lastDataBeforeTimestamp) {
    productContext.lastExecution = {
      id: lastDataBeforeTimestamp.id,
      timestamp: lastDataBeforeTimestamp.executionDate.getTime(),
    };
  }

};

/**
 * APIで取得したリストを10秒ごとに区切って集約する。
 * @param list 約定のリスト。
 * @param timestamp 保存対象の日時。分の単位で切り捨てたエポック時を指定。
 * @returns DBに保存する形式に変換したリスト。
 */
const aggregateExecutions = (list: Execution[], timestamp: number): ExecutionAggregated[] => {

  const result: ExecutionAggregated[] = [];

  for (let i = 0; i < 6; i++) { // 10秒ごとに区切る。
    const startTimestamp = timestamp + i * 10 * 1000; // timestamp + i*10秒
    const endTimestamp = startTimestamp + 10 * 1000; // timestamp + (i+1)*10秒
    const targetExecutions = list.filter((exec) => {
      const t = exec.executionDate.getTime();
      return t >= startTimestamp && t < endTimestamp; // timestamp+i*10秒 <= t < timestamp+(i+1)*10秒 に絞る
    });

    const executionItem: ExecutionAggregated = {
      timestamp: startTimestamp,
      price: 0,
      sellSize: 0,
      buySize: 0,
      totalSize: 0,
    };

    for (let execution of targetExecutions) {
      executionItem.price += execution.price * execution.size; // sizeの重み付き平均をとる。
      executionItem.totalSize += execution.size;
      if (execution.side === 'BUY') executionItem.buySize += execution.size;
      if (execution.side === 'SELL') executionItem.sellSize += execution.size;
    }

    if (executionItem.totalSize) executionItem.price = executionItem.price / executionItem.totalSize;
    result.push(executionItem);
  }

  return result;

};

export default saveExecutionHistory;