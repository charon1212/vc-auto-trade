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
