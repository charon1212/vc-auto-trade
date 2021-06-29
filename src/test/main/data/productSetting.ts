import { sampleProductCode, sampleProductId, sampleRealCurrencyCode, sampleVirtualCurrencyCode } from "./const";

export const productSetting001 = () => ({
  id: sampleProductId,
  currencyCode: { real: sampleRealCurrencyCode, virtual: sampleVirtualCurrencyCode },
  exchangeCode: 'GMO',
  productCode: sampleProductCode,
  orderUnit: 0.0001,
  maxOrderSize: 100,
});
