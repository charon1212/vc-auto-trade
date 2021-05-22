import { ExecutionBitflyer, getExecutions } from "../../Interfaces/ExchangeApi/Bitflyer/getExecutions";
import { setExecution } from "../../Interfaces/AWS/Dynamodb/execution";
import { getProductContext } from "../context";
import { Execution } from "../../Interfaces/DomainType";

/**
 * 与えられた日時の1分間の約定履歴の情報を、DBに保存する。
 *
 * @param date 保存対象の日時。分までが有効で、それ以降は切り捨てる。「2000-01-01 12:34:56.789」が指定された場合、「2000-01-01 12:34:00」～「2000-01-01 12:34:59.999」の間のデータを保存する。
 */
const saveExecutionHistory = async (productCode: string, date: Date) => {

  const timestampByMinute = Math.floor(date.getTime() / (60 * 1000)) * 60 * 1000;
  const productContext = await getProductContext(productCode);
  const lastExecutionId = productContext.lastExecution?.id || undefined;

  let executionList: ExecutionBitflyer[] = [];
  let before: number | undefined = undefined;

  /**
   * BitflyerのAPIは最大500件の同時取得ができるはずだが、50件くらいを境に多めに取りすぎると、なぜか直近のデータが取得できない。
   * (例えば、10時にデータを取得しても一番最近のデータが9時半から始まる。その間の約定履歴がないわけではない。)
   * そこで、ひと手間加える。
   *
   * 取得件数は30件に設定し、最大10回取得する。取得するときは、Product Context で記憶したID以降のデータに絞る。
   * 最初の1回はbefore=undefinedとして直近の30件を取得する。このデータの末尾がtimestampよりも小さい(過去のデータ)であれば、その30件で足りる。
   * 足りなければ、beforeを設定してもう一度読み取る。
   */
  for (let i = 0; i < 10; i++) {
    // after は lastExecutionId - 1 にしておかないと、1分前のデータが取得できず、取得できなくなるまでAPIリクエストを投げることになる。
    const res: ExecutionBitflyer[] = await getExecutions(productCode, 30, before, lastExecutionId && lastExecutionId - 1);
    if (res.length === 0) break;
    executionList.push(...res);
    const startExecutionTimestamp = res[res.length - 1].exec_date.getTime();
    if (startExecutionTimestamp < timestampByMinute) break;
    before = res[res.length - 1].id;
  }

  const executionItemList = convertDbData(executionList, timestampByMinute);

  await setExecution(productCode, timestampByMinute.toString(), executionItemList);

  // product context の last execution id を更新する。
  // 「timestampByMinute + 1分」よりも過去のデータで最新のデータを取得する。
  const lastDataBeforeTimestamp = executionList.find((item) => (item.exec_date.getTime() < timestampByMinute + 60 * 1000));
  if (lastDataBeforeTimestamp) {
    productContext.lastExecution = {
      id: lastDataBeforeTimestamp.id,
      timestamp: lastDataBeforeTimestamp.exec_date.getTime(),
    };
  }

};

/**
 * APIで取得したリストを、DBに保存する形式に変換する。
 * @param list APIから取得したリスト。
 * @param timestamp 保存対象の日時。分の単位で切り捨てたエポック時を指定。
 * @returns DBに保存する形式に変換したリスト。
 */
const convertDbData = (list: ExecutionBitflyer[], timestamp: number): Execution[] => {

  const result: Execution[] = [];

  for (let i = 0; i < 6; i++) { // 10秒ごとに区切る。
    const startTimestamp = timestamp + i * 10 * 1000; // timestamp + i*10秒
    const endTimestamp = startTimestamp + 10 * 1000; // timestamp + (i+1)*10秒
    const targetExecutions = list.filter((exec) => {
      const t = exec.exec_date.getTime();
      return t >= startTimestamp && t < endTimestamp; // timestamp+i*10秒 <= t < timestamp+(i+1)*10秒 に絞る
    });

    const executionItem: Execution = {
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