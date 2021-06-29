import AWS = require("aws-sdk");
import { appLogger } from "../../../Common/log";
import { processEnv } from "../../../Common/processEnv";
import handleError from "../../../HandleError/handleError";
import { ProductSetting } from "../../../Main/productSettings";

const db = new AWS.DynamoDB.DocumentClient();
export type DbSetting<T, DbType> = {
  id: string,
  classTypeSuffix: string,
  sortKey: (item: T) => string,
  encode: (item: T) => DbType,
  decode: (item: DbType) => T,
};

export const getClassType = <T, DbType>(productSetting: ProductSetting, dbSetting: DbSetting<T, DbType>,) => {
  return productSetting.id + dbSetting.classTypeSuffix;
}

export const putDynamoDb = async <T, DbType>(productSetting: ProductSetting, dbSetting: DbSetting<T, DbType>, data: T) => {
  const classType = getClassType(productSetting, dbSetting);
  const sortKey = dbSetting.sortKey(data);
  appLogger.info3(`▲▲${productSetting.id}-AWS-DynamoDB-putDynamoDb-${dbSetting.id}-CALL-${JSON.stringify({ classType, sortKey, data, })}`);
  const item = { ClassType: classType, SortKey: sortKey, data: dbSetting.encode(data), };
  try {
    await db.put({
      TableName: processEnv.TableName,
      Item: item,
    }).promise();
  } catch (err) {
    await handleError(__filename, 'putDynamoDB', 'code', 'DB保存に失敗。', { productSetting, dbSetting, data, }, err);
    return;
  }
};

export const getDynamoDb = async <T, DbType>(productSetting: ProductSetting, dbSetting: DbSetting<T, DbType>, sortKey: string,) => {
  const classType = getClassType(productSetting, dbSetting);
  appLogger.info3(`▲▲${productSetting.id}-AWS-DynamoDB-getDynamoDb-${dbSetting.id}-CALL-${JSON.stringify({ classType, sortKey })}`);
  try {
    const res = await db.get({
      TableName: processEnv.TableName,
      Key: {
        'ClassType': classType,
        'SortKey': sortKey,
      },
    }).promise();
    appLogger.info3(`▲▲${productSetting.id}-AWS-DynamoDB-getDynamoDb-${dbSetting.id}-RESULT-${JSON.stringify({ item: res?.Item })}`);
    if (res?.Item?.data) {
      const data = res?.Item?.data as DbType;
      return dbSetting.decode(data);
    } else {
      return undefined;
    }
  } catch (err) {
    await handleError(__filename, 'getDynamoDB', 'code', 'DB取得に失敗。', { productSetting, dbSetting, sortKey, }, err);
    return undefined;
  }
};

export const searchDynamoDbStartsWith = async <T, DbType>(productSetting: ProductSetting, dbSetting: DbSetting<T, DbType>, startSortKey: string,) => {
  const classType = getClassType(productSetting, dbSetting);
  appLogger.info3(`▲▲${productSetting.id}-AWS-DynamoDB-searchDynamoDbStartsWith-${dbSetting.id}-CALL-${JSON.stringify({ classType, startSortKey })}`);
  return await searchDynamoDb(productSetting, dbSetting, {
    TableName: processEnv.TableName,
    KeyConditionExpression: '#PK = :pk AND begins_with (#SK, :skprefix)',
    ExpressionAttributeNames: { '#PK': 'ClassType', '#SK': 'SortKey', },
    ExpressionAttributeValues: { ':pk': classType, ':skprefix': startSortKey, },
  });
};

export const searchDynamoDbBetween = async <T, DbType>(productSetting: ProductSetting, dbSetting: DbSetting<T, DbType>, startSortKey: string, endSortKey: string, limit?: number,) => {
  const classType = getClassType(productSetting, dbSetting);
  appLogger.info3(`▲▲${productSetting.id}-AWS-DynamoDB-searchDynamoDbBetween-${dbSetting.id}-CALL-${JSON.stringify({ classType, startSortKey, endSortKey })}`);
  return await searchDynamoDb(productSetting, dbSetting, {
    TableName: processEnv.TableName,
    KeyConditionExpression: '#PK = :pk AND #SK BETWEEN :sk1 AND :sk2',
    ExpressionAttributeNames: { '#PK': 'ClassType', '#SK': 'SortKey', },
    ExpressionAttributeValues: { ':pk': classType, ':sk1': startSortKey, ':sk2': endSortKey, },
    Limit: limit,
  });
};

export const searchDynamoDbLast = async <T, DbType>(productSetting: ProductSetting, dbSetting: DbSetting<T, DbType>,) => {
  const classType = getClassType(productSetting, dbSetting);
  appLogger.info3(`▲▲${productSetting.id}-AWS-DynamoDB-searchDynamoDbLast-${dbSetting.id}-CALL-${JSON.stringify({ classType, })}`);
  return await searchDynamoDb(productSetting, dbSetting, {
    TableName: processEnv.TableName,
    Limit: 1,
    ScanIndexForward: false,
    KeyConditionExpression: '#PK = :pk',
    ExpressionAttributeNames: { '#PK': 'ClassType', },
    ExpressionAttributeValues: { ':pk': classType, },
  });
};

const searchDynamoDb = async <T, DbType>(productSetting: ProductSetting, dbSetting: DbSetting<T, DbType>, queryParams: AWS.DynamoDB.DocumentClient.QueryInput) => {
  try {
    const res = await db.query(queryParams).promise();
    appLogger.info3(`▲▲${productSetting.id}-AWS-DynamoDB-searchDynamoDb-${dbSetting.id}-RESULT-${JSON.stringify({ items: res?.Items })}`);
    if (res?.Items) {
      const dataList = res.Items.map((item) => (item.data as DbType));
      return {
        count: res.Count,
        items: dataList.map((data) => dbSetting.decode(data))
      };
    } else {
      await handleError(__filename, 'searchDynamoDb', 'code', 'DBの検索に失敗。', { productSetting, dbSetting, queryParams, });
      return { count: 0, items: [] };
    }
  } catch (err) {
    await handleError(__filename, 'searchDynamoDb', 'code', 'DBの検索に失敗。', { productSetting, dbSetting, queryParams, }, err);
    return { count: 0, items: [] };
  }
};

export const deleteDynamoDb = async <T, DbType>(productSetting: ProductSetting, dbSetting: DbSetting<T, DbType>, sortKey: string,) => {
  const classType = getClassType(productSetting, dbSetting);
  appLogger.info3(`▲▲${productSetting.id}-AWS-DynamoDB-deleteDynamoDb-${dbSetting.id}-CALL-${JSON.stringify({ classType, sortKey, })}`);
  try {
    await db.delete({
      TableName: processEnv.TableName,
      Key: {
        ClassType: classType,
        SortKey: sortKey,
      }
    }).promise();
    return true;
  } catch (err) {
    await handleError(__filename, 'deleteDynamoDb', 'code', 'DBの削除に失敗。', { productSetting, dbSetting, sortKey, }, err);
    return false;
  }
};
