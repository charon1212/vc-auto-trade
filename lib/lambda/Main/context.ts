import handleError from "../HandleError/handleError";
import { VCATProductContext, getProductContext as getProductContextFromDB, setProductContext as setProductContextToDB } from "../Interfaces/AWS/Dynamodb/context";
import { productSettings } from "./productSettings";

let productContextList: { productCode: string, context: VCATProductContext, }[] | undefined;

/**
 * DynamoDBからコンテキストを読み込む。
 * アプリケーション稼働後に一度だけ実行すること。
 */
export const importProductContextFromDb = async () => {

  productContextList = [];
  for (let productSetting of productSettings) {
    const context = await getProductContextFromDB(productSetting.productCode);
    productContextList.push({
      productCode: productSetting.productCode,
      context: context,
    });
  }

};

/**
 * Product ごとのコンテキストを取得する。
 * この関数を呼び出す前に、getFromDbを呼び出すこと。
 *
 * @param productCode productSettingsで定義したプロダクトコード。
 * @returns Product Context
 */
export const getProductContext = async (productCode: string): Promise<VCATProductContext> => {

  if (!productContextList) return {};
  const productContext = productContextList.find((item) => (item.productCode === productCode))?.context;
  if (productContext) {
    return productContext
  } else {
    await handleError(__filename, 'getProductContext', 'code', 'ProductContextの取得に失敗。', { productCode });
    return {};
  }

};

/**
 * Product Context を保存する。
 */
export const saveProductContext = async () => {

  if (!productContextList) return;
  const promiseList: Promise<void>[] = [];
  for (let productContext of productContextList) {
    promiseList.push(setProductContextToDB(productContext.productCode, productContext.context));
  }
  await Promise.all(promiseList);

};
