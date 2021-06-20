import { asyncExecution } from "../Common/util";
import handleError from "../HandleError/handleError";
import { getDynamoDb, putDynamoDb } from "../Interfaces/AWS/Dynamodb/db";
import { dbSettingProductContext, sortKeyContext } from "../Interfaces/AWS/Dynamodb/dbSettings";
import { VCATProductContext } from "../Interfaces/DomainType";
import { getProductSetting, ProductId, productSettings } from "./productSettings";

let productContextList: { productId: ProductId, context: VCATProductContext, }[] | undefined;

/**
 * DynamoDBからコンテキストを読み込む。
 * アプリケーション稼働後に一度だけ実行すること。
 */
export const importProductContextFromDb = async () => {
  /** スクリプトのフィールドで定義した変数「productContextList」は、Lambda関数実行ごとにクリアされるとは限らない。コンテナが再起動した場合は作り直されるが、そうでなければ前の情報を保持してしまう。そのため、必ずクリアする。 */
  productContextList = [];
  for (let productSetting of productSettings) {
    const context = await getDynamoDb(productSetting, dbSettingProductContext, sortKeyContext) || {};
    productContextList.push({
      productId: productSetting.id,
      context: context,
    });
  }
};

/**
 * Product ごとのコンテキストを取得する。
 * この関数を呼び出す前に、getFromDbを呼び出すこと。
 *
 * @param productId productSettingsで定義したプロダクトコード。
 * @returns Product Context
 */
export const getProductContext = async (productId: ProductId): Promise<VCATProductContext | undefined> => {
  if (!productContextList) return undefined;
  const productContext = productContextList.find((item) => (item.productId === productId))?.context;
  if (productContext) {
    return productContext
  } else {
    await handleError(__filename, 'getProductContext', 'code', 'ProductContextの取得に失敗。', { productId });
    return undefined;
  }
};

/**
 * Product Context を保存する。
 */
export const saveProductContext = async () => {
  if (!productContextList) return;
  await asyncExecution(...(productContextList.map((productContext) => (async () => {
    const productSetting = getProductSetting(productContext.productId);
    if (productSetting) {
      await putDynamoDb(productSetting, dbSettingProductContext, productContext.context);
    } else {
      await handleError(__filename, 'saveProductContext', 'code', 'ProductSettingが取得できません。', { productContext });
    }
  }))));
};
