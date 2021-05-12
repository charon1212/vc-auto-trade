export type ProductSetting = {
  productCode: string,
};

export const productSettings: ProductSetting[] = [
  { productCode: 'XRP_JPY' },
  { productCode: 'BTC_JPY' },
  { productCode: 'ETH_JPY' },
];

export const getProductSetting = (productCode: string) => {
  return productSettings.find((item) => (item.productCode === productCode));
};
