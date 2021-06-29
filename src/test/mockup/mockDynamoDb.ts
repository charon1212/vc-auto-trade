import * as dbModule from "../../lib/lambda/Interfaces/AWS/Dynamodb/db";
import { DbSetting } from "../../lib/lambda/Interfaces/AWS/Dynamodb/db";
import { ProductSetting } from "../../lib/lambda/Main/productSettings";

export type DynamoDbRecord = {
  ClassType: string,
  SortKey: string,
  data: any,
};

let dataList: DynamoDbRecord[];

/**
 * DB操作をモック化する。
 * @param sourceDataList DBの初期データ。SortKeyの昇順でソートしておくこと。dataは、Encode前のDomainTypeそのままで登録すること。
 */
export const mockDynamoDb = (sourceDataList: DynamoDbRecord[]) => {

  dataList = sourceDataList;
  const mockPutDynamoDb = jest.spyOn(dbModule, 'putDynamoDb').mockImplementation(
    async (...args) => (await mockImplPutDynamoDb(...args))
  );
  const mockGetDynamoDb = jest.spyOn(dbModule, 'getDynamoDb').mockImplementation(
    async (...args) => (await mockImplGetDynamoDb(...args))
  );
  const mockSearchDynamoDbStartsWith = jest.spyOn(dbModule, 'searchDynamoDbStartsWith').mockImplementation(
    async (...args) => (await mockImplSearchDynamoDbStartsWith(...args))
  );
  const mockSearchDynamoDbBetween = jest.spyOn(dbModule, 'searchDynamoDbBetween').mockImplementation(
    async (...args) => (await mockImplSearchDynamoDbBetween(...args))
  );
  const mockSearchDynamoDbLast = jest.spyOn(dbModule, 'searchDynamoDbLast').mockImplementation(
    async (...args) => (await mockImplSearchDynamoDbLast(...args))
  );
  const mockDeleteDynamoDb = jest.spyOn(dbModule, 'deleteDynamoDb').mockImplementation(
    async (...args) => (await mockImplDeleteDynamoDb(...args))
  );
  const getDynamoDbDataList = () => (dataList);

  return {
    mockPutDynamoDb,
    mockGetDynamoDb,
    mockSearchDynamoDbStartsWith,
    mockSearchDynamoDbBetween,
    mockSearchDynamoDbLast,
    mockDeleteDynamoDb,
    getDynamoDbDataList,
  };

};

const getClassType = <T, DbType>(productSetting: ProductSetting, dbSetting: DbSetting<T, DbType>,) => {
  return productSetting.id + dbSetting.classTypeSuffix;
};

const mockImplPutDynamoDb = async <T, DbType>(productSetting: ProductSetting, dbSetting: DbSetting<T, DbType>, data: T) => {
  const classType = getClassType(productSetting, dbSetting);
  const sortKey = dbSetting.sortKey(data);
  dataList.filter((record) => (record.ClassType !== classType || record.SortKey !== sortKey));
  dataList.push({ ClassType: classType, SortKey: sortKey, data: data, });
};
const mockImplGetDynamoDb = async <T, DbType>(productSetting: ProductSetting, dbSetting: DbSetting<T, DbType>, sortKey: string) => {
  const classType = getClassType(productSetting, dbSetting);
  return dataList.find((record) => (record.ClassType === classType && record.SortKey === sortKey))?.data as T | undefined;
};
const mockImplSearchDynamoDbStartsWith = async <T, DbType>(productSetting: ProductSetting, dbSetting: DbSetting<T, DbType>, startSortKey: string,) => {
  const classType = getClassType(productSetting, dbSetting);
  return mockImplSearchDynamoDb(dataList, (record) => (record.ClassType === classType && record.SortKey.startsWith(startSortKey)), false,);
};
const mockImplSearchDynamoDbBetween = async <T, DbType>(productSetting: ProductSetting, dbSetting: DbSetting<T, DbType>, startSortKey: string, endSortKey: string, limit?: number,) => {
  const classType = getClassType(productSetting, dbSetting);
  return mockImplSearchDynamoDb(dataList, (record) => (record.ClassType === classType && record.SortKey >= startSortKey && record.SortKey < endSortKey), false,);
};
const mockImplSearchDynamoDbLast = async <T, DbType>(productSetting: ProductSetting, dbSetting: DbSetting<T, DbType>,) => {
  const classType = getClassType(productSetting, dbSetting);
  return mockImplSearchDynamoDb(dataList, (record) => (record.ClassType === classType), false, 1);
};
const mockImplDeleteDynamoDb = async <T, DbType>(productSetting: ProductSetting, dbSetting: DbSetting<T, DbType>, sortKey: string,) => {
  const classType = getClassType(productSetting, dbSetting);
  dataList.filter((record) => (record.ClassType !== classType || record.SortKey !== sortKey));
  return true;
};

const mockImplSearchDynamoDb = async <T, DbType>(dataList: DynamoDbRecord[], filter: (record: DynamoDbRecord) => boolean, inverse: boolean, limit?: number,) => {
  const sortedDataList = inverse ? [...dataList].reverse() : dataList;
  const result = sortedDataList.filter((record) => filter(record));
  const slicedResult = limit ? result.slice(0, limit) : result;
  return {
    count: slicedResult.length,
    items: slicedResult.map((record) => (record.data)),
  };
};
