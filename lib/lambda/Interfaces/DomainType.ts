export type ExecutionAggregated = {
  timestamp: number,
  price: number,
  sellSize: number,
  buySize: number,
  totalSize: number,
};

export type Execution = {
  id: number,
  price: number,
  side: 'SELL' | 'BUY' | '',
  size: number,
  executionDate: Date,
};

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
