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

export type OrderType = 'LIMIT' | 'MARKET' | 'STOP' | 'STOP_LIMIT' | 'TRAIL';
export type OrderSide = 'BUY' | 'SELL';
export type ParentOrderMethod = 'NORMAL' | 'SIMPLE' | 'IFD' | 'OCO' | 'IFDOCO';
export type OrderState = 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'REJECTED' | 'COMPLETED' | 'UNKNOWN';

/**
 * 自分が発注した注文情報。
 * コメントが★から始まるプロパティは、発注時に入力する情報。
 * それ以外は、発注後に同期処理で決まる値。
 *
 * 特殊注文におけるOrder.stateは、次のロジックで決定する。
 * - 優先順位を「 ACTIVE > UNKNOWN > REJECTED > COMPLETED > CANCELED > EXPIRED」とし、この順にchildOrderListの中で存在するstateを選択する。
 */
export type Order = {
  id?: number, // ページング用の通し番号
  orderId?: string, // 注文ID
  acceptanceId: string, // ★注文受付ID

  parentSortMethod: ParentOrderMethod, // ★注文方法。NORMALは通常注文、それ以外は特殊注文。
  orderDate: Date, // ★発注日時

  state: OrderState, // 注文の状態。通常注文の場合はchildOrderList[0].stateと同じ。特殊注文の場合は、ドキュメントコメントに記載のロジックで決定する。

  childOrderList: { // 注文の中身を表す配列。通常注文とSIMPLE注文は1個、IFDとOCO注文は2個、IFDOCO注文は3個
    orderType: OrderType, // ★注文の種類
    side: OrderSide, // ★売り注文・買い注文
    size: number, // ★注文数量
    price?: number, // ★指値。orderTypeがLIMIT, STOP_LIMITの場合に必須。
    triggerPrice?: number, // ★トリガー価格。orderTypeがSTOP, STOP_LIMITの場合に必須。
    offset?: number, // ★トレール幅。orderTypeがTRAILの場合に必須。
    averagePrice?: number, // 平均取引価格。
    state: OrderState, // 注文の状態
    outstandingSize?: number, // 未約定の量
    cancelSize?: number, // キャンセルした量
    executedSize?: number, // 約定した量
  }[],
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
