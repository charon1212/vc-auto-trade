import AWS = require("aws-sdk");
import { processEnv } from "../../../Common/processEnv";

export const db = new AWS.DynamoDB.DocumentClient();
export type DynamoDBRecord = {
  ClassType: string,
  SortKey: string,
  data?: any,
  ExecutionList?: any[],
};

export const putDynamoDB = async (record: DynamoDBRecord) => {
  const res = await db.put({
    TableName: processEnv.TableName,
    Item: record,
  }).promise();
  return res;
};

export const getDynamoDB = async (classType: string, sortKey: string) => {
  const res = await db.get({
    TableName: processEnv.TableName,
    Key: {
      'ClassType': classType,
      'SortKey': sortKey,
    },
  }).promise();
  return res.Item as DynamoDBRecord | undefined
};

export const searchDynamoDB = async (params: { condition: string, paramLabel: { [key: string]: string }, paramValue: { [key: string]: string } }) => {
  const res = await db.query({
    TableName: processEnv.TableName,
    KeyConditionExpression: params.condition,
    ExpressionAttributeNames: params.paramLabel,
    ExpressionAttributeValues: params.paramValue,
  }).promise();
  return res as { Count?: number, Items?: DynamoDBRecord[] };
};

