import { getNowTimestamp } from "../../Common/util";
import handleError from "../../HandleError/handleError";
import { LambdaExecutionChecker } from "./LambdaExecutionChecker";
import { ProductId, ProductSetting } from "../productSettings";
import { StandardTime } from "./StandardTime";
import { TradeReportManager } from "./TradeReportManager";

export type Container = {
  standardTime: StandardTime,
  lambdaExecutionChecker: LambdaExecutionChecker,
  tradeReportManager: TradeReportManager,
};

let productContainerList: { productId: ProductId, container: Container }[] = [];

export const setupVcatDiContainer = (productStting: ProductSetting) => {
  productContainerList = [];
  const container: Container = {
    standardTime: new StandardTime(getNowTimestamp()),
    lambdaExecutionChecker: new LambdaExecutionChecker(),
    tradeReportManager: new TradeReportManager(),
  }
  productContainerList.push({ productId: productStting.id, container });
  return container;
};

export const saveVcatDiContainer = async (productSetting: ProductSetting) => {
  const productContainer = productContainerList.find(c => (c.productId === productSetting.id));
  if (!productContainer) {
    await handleError(__filename, 'getContainer', 'code', 'ProductContainerが見つからない。', { productSetting },);
    throw new Error('ProductContainerが見つからない。');
  }
  await productContainer.container.lambdaExecutionChecker.registerDb(productSetting);
  await productContainer.container.tradeReportManager.save(productSetting);
};

export const getVcatDiContainer = async (productId: ProductId) => {
  const productContainer = productContainerList.find((c) => (c.productId === productId));
  if (!productContainer) {
    await handleError(__filename, 'getContainer', 'code', 'ProductContainerが見つからない。', { productId },);
    throw new Error('ProductContainerが見つからない。');
  } else {
    return productContainer.container
  }
};
