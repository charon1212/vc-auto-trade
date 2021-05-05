import { ExecutionItem } from "../ExecutionHistory/saveExecutionHistory";
import * as AWS from 'aws-sdk';
import handleError from "../HandleError/handleError";

const db = new AWS.DynamoDB.DocumentClient();

export const setExecution = async (classType: string, sortKey: string, data: ExecutionItem[]) => {

  try {
    await db.put({
      TableName: process.env.TableName || '',
      Item: {
        ClassType: classType,
        SortKey: sortKey,
        ExecutionList: data,
      }
    }).promise();
  } catch (err) {
    handleError('', `error: ${JSON.stringify(err)}`);
  }

};

export type ExecutionDynamoDB = {
  ClassType: string,
  SortKey: string,
  ExecutionList: ExecutionItem[],
}
