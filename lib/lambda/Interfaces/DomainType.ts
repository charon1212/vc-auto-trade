/**
 * 集計約定。一定期間の約定を集計したデータ。
 */
export type ExecutionAggregated = {
  timestamp: number, // 集計期間の開始点のUnixタイムスタンプ
  price: number, // 平均価格。平均は、Sizeの重みづけ平均。
  sellSize: number, // 売り注文がトリガーで約定した取引量。
  buySize: number, // 買い注文がトリガーで約定した取引量。
  totalSize: number, // 全取引量。板寄せなどで決まると買い注文トリガーでも売り注文トリガーでもない約定が起こるため、sellSize + buySizeと一致するとは限らない。
};

/**
 * 約定。買い手と売り手が合意して成立した、暗号通貨の取引のこと。
 */
export type Execution = {
  id: number, // 約定ID
  price: number, // 約定価格
  side: 'SELL' | 'BUY' | '', // 約定のトリガーが買い注文(BUY)か、売り注文(SELL)かを表す。例えば、指値の買い注文に成行の売り注文が来て約定したなら、売り注文がトリガーなのでsideはSELL。板寄せで決まると空文字になる。
  size: number, // 取引量。
  executionDate: Date, // 約定日時。
};

/**
 * 自分が発注した注文情報。
 */
export type Order = {
  id: number, // ページング用の通し番号
  side: 'BUY' | 'SELL', // 売り注文・買い注文
  child_order_type: 'LIMIT' | 'MARKET', // 指値・成行
  price?: number, // 指値の対象価格
  average_price: number, // 約定価格？
  size: number, // 取引量
  child_order_state: 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'REJECTED' | 'COMPLETED', // 注文の状態。
  expire_date: Date, // 有効期限
  child_order_date: Date, // 注文を発行した日時？
  child_order_acceptance_id: string, // 注文受付ID
  outstanding_size: number, // ?
  cancel_size: number, // キャンセルした量
  executed_size: number, // 約定した量
};

/**
 * ある通貨(JPYやBTC)に関する資産残高。
 * 例えば、トータルでは1万円持っているが、3000円分の買い注文を出しているときは、amountが10000でavailableが7000となる。
 */
export type Balance = {
  currencyCode: string, // 通貨の種類を表すコード
  amount: number, // 総額
  available: number, // 利用可能額
};
