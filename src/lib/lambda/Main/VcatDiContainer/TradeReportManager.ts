import { asyncExecutionArray } from "../../Common/util";
import { putDynamoDb } from "../../Interfaces/AWS/Dynamodb/db";
import { dbSettingTradeReport } from "../../Interfaces/AWS/Dynamodb/dbSettings";
import { ProductSetting } from "../productSettings";

export type TradeReportOne = {
  price: number,
  amount: number,
  timestamp: number,
};
export type TradeReport = {
  buy: TradeReportOne,
  sell: TradeReportOne,
  isStopLoss: boolean,
};

export class TradeReportManager {
  private reportList: TradeReport[];
  constructor() {
    this.reportList = [];
  }
  add(report: TradeReport) {
    this.reportList.push(report);
  }
  async save(productSetting: ProductSetting) {
    await asyncExecutionArray(this.reportList, async (report) => {
      await putDynamoDb(productSetting, dbSettingTradeReport, report);
    });
  }
}
