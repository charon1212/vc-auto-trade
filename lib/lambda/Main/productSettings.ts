export type ProductSetting = {
  productCode: string,
  orderUnit: number,
  maxOrderSize: number,
};

export const productSettings: ProductSetting[] = [
  { productCode: 'XRP_JPY', orderUnit: 0.1, maxOrderSize: 10000 },
  { productCode: 'BTC_JPY', orderUnit: 0.001, maxOrderSize: 50 },
  { productCode: 'ETH_JPY', orderUnit: 0.01, maxOrderSize: 50 },
];

export const getProductSetting = (productCode: string) => {
  return productSettings.find((item) => (item.productCode === productCode));
};
