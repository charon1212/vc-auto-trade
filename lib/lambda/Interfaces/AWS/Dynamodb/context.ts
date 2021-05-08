import handleError from "../../../HandleError/handleError";
import { db } from "./db";

export type VCATProductContext = {
  lastExecution?: {
    id?: number,
    timestamp?: number,
  },
};
type ContextRecord = {
  ClassType: string,
  SortKey: string,
  data: VCATProductContext,
};

const suffixContext = 'CONTEXT';

const getProductContextClassType = (productCode: string) => {
  return productCode + suffixContext;
};

export const getProductContext = async (productCode: string): Promise<VCATProductContext> => {
  try {
    const res = await db.get({
      TableName: process.env.TableName || '',
      Key: {
        'ClassType': getProductContextClassType(productCode),
        'SortKey': '',
      },
    }).promise();
    if (res.Item) {
      const record = res.Item as ContextRecord;
      return record.data;
    } else {
      return {};
    }
  } catch (err) {
    handleError('', `ProductContextの取得に失敗。productCode:${productCode}`, err);
    return {};
  }
};

export const setProductContext = async (productCode: string, data: VCATProductContext) => {
  const item: ContextRecord = {
    ClassType: getProductContextClassType(productCode),
    SortKey: '',
    data: data,
  };
  try {
    await db.put({
      TableName: process.env.TableName || '',
      Item: item,
    }).promise();
  } catch (err) {
    handleError('', '', err);
    return;
  }
};


