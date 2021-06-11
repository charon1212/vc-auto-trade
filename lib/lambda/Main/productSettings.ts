export type ProductSetting = {
  id: ProductId,
  productCode: ProductCode,
  exchangeCode: ExchangeCode,
  currencyCode: {
    virtual: string,
    real: string,
  },
  orderUnit: number,
  maxOrderSize: number,
};

export type ProductId = 'XRP_JPY' | 'BTC_JPY' | 'ETH_JPY' | 'GMO-BTC';
export type ProductCode = 'XRP_JPY' | 'BTC_JPY' | 'ETH_JPY' | 'BTC';
export type ExchangeCode = 'Bitflyer' | 'GMO';

export const productSettings: ProductSetting[] = [
  {
    id: 'XRP_JPY',
    exchangeCode: 'Bitflyer',
    productCode: 'XRP_JPY',
    currencyCode: { real: 'JPY', virtual: 'XRP' },
    orderUnit: 0.1,
    maxOrderSize: 10000
  },
  {
    id: 'BTC_JPY',
    exchangeCode: 'Bitflyer',
    productCode: 'BTC_JPY',
    currencyCode: { real: 'JPY', virtual: 'BTC' },
    orderUnit: 0.001,
    maxOrderSize: 50
  },
  {
    id: 'ETH_JPY',
    exchangeCode: 'Bitflyer',
    productCode: 'ETH_JPY',
    currencyCode: { real: 'JPY', virtual: 'ETH' },
    orderUnit: 0.01,
    maxOrderSize: 50
  },
];

export const getProductSetting = (productCode: string) => {
  return productSettings.find((item) => (item.productCode === productCode));
};
