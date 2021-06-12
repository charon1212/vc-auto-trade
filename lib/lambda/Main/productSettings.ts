import { processEnv } from "../Common/processEnv";

export type ProductSetting = {
  id: ProductId, // プロダクトを表す一意識別子。本システムで定義するコード値。DB保存の際のprefix等に利用する。
  productCode: ProductCode, // プロダクトコード。取引所APIの引数として渡すコード値。渡し先のAPI仕様に準拠して定義する。
  exchangeCode: ExchangeCode, // 取引所を表す一意識別子。本システムで定義するコード値。
  currencyCode: { // 取引対象の通貨コード。取引所APIの引数として渡すコード値。
    virtual: string, // 仮想通貨の通貨コード。BTC等。
    real: string, // 実通貨の通貨コード。だいたいJPY。
  },
  orderUnit: number, // 注文単位。
  maxOrderSize: number, // 最大注文量。注文単位の何倍かで定義。
  executeOrderPhase: boolean, // 注文処理を実施するかどうか。
};

export type ProductId = 'XRP_JPY' | 'BTC_JPY' | 'ETH_JPY' | 'GMO-BTC';
export type ProductCode = 'XRP_JPY' | 'BTC_JPY' | 'ETH_JPY' | 'BTC';
export type ExchangeCode = 'Bitflyer' | 'GMO';

const productSettingsProd: ProductSetting[] = [
  {
    id: 'XRP_JPY',
    exchangeCode: 'Bitflyer',
    productCode: 'XRP_JPY',
    currencyCode: { real: 'JPY', virtual: 'XRP' },
    orderUnit: 0.1,
    maxOrderSize: 10000,
    executeOrderPhase: false,
  },
  {
    id: 'BTC_JPY',
    exchangeCode: 'Bitflyer',
    productCode: 'BTC_JPY',
    currencyCode: { real: 'JPY', virtual: 'BTC' },
    orderUnit: 0.001,
    maxOrderSize: 50,
    executeOrderPhase: false,
  },
  {
    id: 'ETH_JPY',
    exchangeCode: 'Bitflyer',
    productCode: 'ETH_JPY',
    currencyCode: { real: 'JPY', virtual: 'ETH' },
    orderUnit: 0.01,
    maxOrderSize: 50,
    executeOrderPhase: false,
  },
];

const productSettingsDev: ProductSetting[] = productSettingsProd.map((productSettings) => productSettings);

export const productSettings: ProductSetting[] = processEnv.EnvName === 'production' ? productSettingsProd : productSettingsDev;

export const getProductSetting = (productId: ProductId) => {
  return productSettings.find((item) => (item.id === productId));
};
