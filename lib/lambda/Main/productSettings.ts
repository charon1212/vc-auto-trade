export type ProductSetting = {
  productCode: string,
};

export const productSettings: ProductSetting[] = [
  { productCode: 'XRP_JPY' }
];

export const getProductSetting = (productCode: string) => {
  return productSettings.find((item) => (item.productCode === productCode));
};
