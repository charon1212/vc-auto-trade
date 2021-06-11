import { ProductCode } from "../../Main/productSettings";
import { Execution } from "../DomainType";
import { ExecutionBitflyer, getExecutions as getBitflyerExecutions } from "./Bitflyer/getExecutions";

/**
 * 指定した時刻以降の約定履歴を取得する。
 * 取引所のAPIから約定履歴を取得して、業務ロジックで使いやすい形に変換する。
 * @param timestamp 約定履歴を取得する期間の、開始時刻を表すUnix timestamp。
 * @param productCode 取引対象のプロダクトコード。
 * @param lastExecutionId timestamp以前の約定ID。なければ指定しなくてもよいが、あると検索効率が上がる。
 * @returns 指定した時刻以降の約定履歴。
 */
export const getExecutions = async (timestamp: number, productCode: ProductCode, lastExecutionId?: number) => {

  const executionList: ExecutionBitflyer[] = [];
  let before: number | undefined = undefined;

  /**
   * BitflyerのAPIは最大500件の同時取得ができるはずだが、50件くらいを境に多めに取りすぎると、なぜか直近のデータが取得できない。
   * (例えば、10時にデータを取得しても一番最近のデータが9時半から始まる。9時半～10時の約定履歴がないわけではない。)
   *
   * そこで、取得件数は30件に設定し、最大10回取得する。取得するときは、Product Context で記憶したID以降のデータに絞る。
   * 最初の1回はbefore=undefinedとして直近の30件を取得する。このデータの末尾がtimestampよりも小さい(過去のデータ)であれば、その30件で足りる。
   * 足りなければ、beforeを設定してもう一度読み取る。
   */
  for (let i = 0; i < 10; i++) {
    // after は lastExecutionId - 1 にしておかないと、1分前のデータが取得できず、取得できなくなるまでAPIリクエストを投げることになる。
    const res: ExecutionBitflyer[] = await getBitflyerExecutions(productCode, 30, before, lastExecutionId && lastExecutionId - 1);
    if (res.length === 0) break;
    executionList.push(...res);
    const startExecutionTimestamp = res[res.length - 1].exec_date.getTime();
    if (startExecutionTimestamp < timestamp) break;
    before = res[res.length - 1].id;
  }

  return executionList
    .filter((exec) => exec.exec_date.getTime() >= timestamp) // timestamp以降の約定に絞る
    .map((exec): Execution => ({
      id: exec.id,
      executionDate: exec.exec_date,
      price: exec.price,
      side: exec.side,
      size: exec.size
    })); // データ型をBitflyerから変換する。

};
