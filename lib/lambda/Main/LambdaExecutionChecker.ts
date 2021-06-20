import { putDynamoDb } from "../Interfaces/AWS/Dynamodb/db";
import { dbSettingLambdaExecutionLive } from "../Interfaces/AWS/Dynamodb/dbSettings";
import { ProductSetting } from "./productSettings";

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
    this.timestamp = Date.now();
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
  }
}