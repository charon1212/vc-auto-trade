import { asyncExecutionArray } from "../../Common/util";
import { deleteDynamoDb, searchDynamoDbStartsWith } from "../../Interfaces/AWS/Dynamodb/db";
import { dbSettingOrder, getOrderSortKey, getOrderStateCode } from "../../Interfaces/AWS/Dynamodb/dbSettings";
import { getProductContext, importProductContextFromDb, saveProductContext } from "../../Main/context";
import { ProductId, ProductSetting, productSettings } from "../../Main/productSettings";

type Event = {
  batchName?: string,
  productId?: ProductId | 'All';
};

exports.handler = async (event: Event) => {

  if (event.batchName === 'initializeProductContext' && event.productId) await initializeProductContext(event.productId);
  if (event.batchName === 'deleteAllUnkActOrdersFromDb' && event.productId) await deleteAllUnkActOrdersFromDb(event.productId);

  return '';

};

/**
 * 特定のプロダクトIDに対して、executorを実行する。
 * @param productId 特定のproductId。Allを指定すると、すべてのProductIdに対して並列実行する。
 * @param executor 実行する内容
 */
const executeSpecificProduct = async (productId: ProductId | 'All', executor: (productSetting: ProductSetting) => Promise<void>) => {
  if (productId === 'All') {
    asyncExecutionArray(productSettings, executor);
  } else {
    const productSetting = productSettings.find((s) => s.id === productId);
    if (productSetting) await executor(productSetting);
  }
};

const initializeProductContext = async (productId: ProductId | 'All') => {
  await importProductContextFromDb();
  executeSpecificProduct(productId, async (productSetting) => {
    const context = await getProductContext(productSetting.id);
    if (!context) return;
    if (context.orderPhase === undefined) context.orderPhase = 'Buy';
    if (context.afterSendOrder === undefined) context.afterSendOrder = false;
    if (context.executionSetting === undefined) {
      context.executionSetting = {
        executePhase: true,
        executeMain: true,
        makeNewOrder: true,
      };
    }
  });
  await saveProductContext();
};

const deleteAllUnkActOrdersFromDb = async (productId: ProductId | 'All') => {
  executeSpecificProduct(productId, async (productSetting) => {
    const unkOrders = await searchDynamoDbStartsWith(productSetting, dbSettingOrder, getOrderStateCode('UNKNOWN'));
    const actOrders = await searchDynamoDbStartsWith(productSetting, dbSettingOrder, getOrderStateCode('ACTIVE'));
    for (let order of [...unkOrders.items, ...actOrders.items]) {
      await deleteDynamoDb(productSetting, dbSettingOrder, getOrderSortKey(order.state, order.id, order.orderDate));
    }
  });
};
