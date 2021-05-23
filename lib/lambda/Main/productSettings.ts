export type ProductSetting = {
  productCode: string,
  currencyCode: {
    virtual: string,
    real: string,
  },
  orderUnit: number,
  maxOrderSize: number,
};

export const productSettings: ProductSetting[] = [
  { productCode: 'XRP_JPY', currencyCode: { real: 'JPY', virtual: 'XRP' }, orderUnit: 0.1, maxOrderSize: 10000 },
  { productCode: 'BTC_JPY', currencyCode: { real: 'JPY', virtual: 'BTC' }, orderUnit: 0.001, maxOrderSize: 50 },
  { productCode: 'ETH_JPY', currencyCode: { real: 'JPY', virtual: 'ETH' }, orderUnit: 0.01, maxOrderSize: 50 },
];

export const getProductSetting = (productCode: string) => {
  return productSettings.find((item) => (item.productCode === productCode));
};
