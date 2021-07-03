import { asyncExecution, asyncExecutionArray, getNowTimestamp } from "../../Common/util";
import { deleteDynamoDb, putDynamoDb, searchDynamoDbBetween } from "../../Interfaces/AWS/Dynamodb/db";
import { dbSettingLambdaExecutionLive } from "../../Interfaces/AWS/Dynamodb/dbSettings";
import { ProductSetting } from "../productSettings";

export type LambdaExecutionLive = {
  isExecuteMain: boolean,
  isExecuteLast: boolean,
  timestamp: number,
};

export class LambdaExecutionChecker {
  private isExecuteMain: boolean;
  private isExecuteLast: boolean;
  private timestamp: number;
  constructor() {
    this.isExecuteMain = false;
    this.isExecuteLast = false;
    this.timestamp = getNowTimestamp();
  }
  executeMain() {
    this.isExecuteMain = true;
  }
  executeLast() {
    this.isExecuteLast = true;
  }
  async registerDb(productSetting: ProductSetting) {
    const data = {
      isExecuteMain: this.isExecuteMain,
      isExecuteLast: this.isExecuteLast,
      timestamp: this.timestamp,
    };
    await putDynamoDb(productSetting, dbSettingLambdaExecutionLive, data);
    // 1日以上前のデータはすべて削除する。
    await this.deleteBeforeCheckData(productSetting, this.timestamp - 24 * 60 * 60 * 1000);
  }
  /** endTimestamp以前の死活情報をすべて削除する。 */
  private async deleteBeforeCheckData(productSetting: ProductSetting, endTimestamp: number) {
    const data = await searchDynamoDbBetween(productSetting, dbSettingLambdaExecutionLive, '0', endTimestamp.toString(), 20);
    if (data?.items) {
      await asyncExecutionArray(data.items, async (lambdaExecutionLive) => {
        await deleteDynamoDb(productSetting, dbSettingLambdaExecutionLive, lambdaExecutionLive.timestamp.toString());
      });
    }
  }
}