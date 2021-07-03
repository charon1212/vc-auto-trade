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

export type OrderType = 'LIMIT' | 'MARKET' | 'STOP';
export type OrderSide = 'BUY' | 'SELL';
export type OrderState = 'UNKNOWN' | 'ACTIVE' | 'COMPLETED' | 'INVALID';

/**
 * 自分が発注した注文情報。
 * コメントが★から始まるプロパティは、発注時に入力する情報。
 * それ以外は、発注後に同期処理で決まる値。
 *
 */
export type SimpleOrder = {
  id: string, // 注文を一意に識別するID。
  idGmo?: number, // GMOの注文の場合は必須。
  idBitflyer?: { // Bitflyerの注文の場合は必須。
    id?: number,
    orderId?: string,
    acceptanceId: string,
  },
  orderDate: Date, // ★発注日時
  state: OrderState, // ★注文の状態。通常注文の場合はchildOrderList[0].stateと同じ。特殊注文の場合は、ドキュメントコメントに記載のロジックで決定する。
  main: {
    orderType: OrderType, // ★注文の種類
    side: OrderSide, // ★売り注文・買い注文
    size: number, // ★注文数量
    price?: number, // ★指値。
    averagePrice?: number, // 平均取引価格。
  },
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

/**
 * プロダクトごとのコンテキスト情報。
 * Lambda関数は1分ごとの実行でデータ共有が保証されないため、DynamoDBにコンテキスト情報として保存し、それを開始時に読み込むことで情報共有を行う。
 * コンテキストは初回実行時など、何もない状態から始まることも想定されるため、全てのプロパティがundefinedになりうるとして設計すること。
 */
export type VCATProductContext = {
  lastExecution?: {
    id?: number,
    timestamp?: number,
  },
  orderPhase?: OrderPhase,
  afterSendOrder?: boolean,
  orderId?: string,
  buyOrderPrice?: number,
  buyOrderInfo?: {
    timestamp?: number,
    price?: number,
    amount?: number,
  },
  startBuyTimestamp?: number,
  executionSetting?: { // 各工程を実行するかどうか指定する
    executePhase?: boolean, // 処理フェーズを実行する
    executeMain?: boolean, // メインフェーズを実行する
    makeNewOrder?: boolean, // 新規の買い注文を発注する
  }
};
/**
 * オーダー状態
 * - Buy: 買い注文のタイミング待ち、または買い注文を出してから約定するまでの間
 * - Sell: 売り注文のタイミング待ち、または売り注文を出してから約定するまでの間
 * - StopLoss: 損切判断後、損切の注文が約定するまでの間
 * - Wait: 注文を一切行わない待機期間
 */
export type OrderPhase = 'Buy' | 'Sell' | 'StopLoss' | 'Wait';
