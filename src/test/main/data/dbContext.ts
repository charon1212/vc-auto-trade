export const dbContext001 = () => ({
  lastExecution: undefined,
  orderPhase: 'Wait',
  afterSendOrder: false,
  orderId: undefined,
  buyOrderPrice: undefined,
  startBuyTimestamp: undefined,
  executionSetting: {
    executePhase: false,
    executeMain: false,
    makeNewOrder: false,
  },
});
