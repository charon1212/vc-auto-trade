import { deleteDynamoDb, searchDynamoDbStartsWith } from "../Interfaces/AWS/Dynamodb/db";
import { dbSettingOrder, getOrderSortKey, getOrderStateCode } from "../Interfaces/AWS/Dynamodb/dbSettings";
import { ProductId } from "../Main/productSettings";
import { executeSpecificProduct } from "./util";

/**
 * 全てのUNKNOWNとACTIVEな注文情報をDBから削除する。
 * @param productId 
 */
export const deleteAllUnkActOrdersFromDb = async (productId: ProductId | 'All') => {
  await executeSpecificProduct(productId, async (productSetting) => {
    const unkOrders = await searchDynamoDbStartsWith(productSetting, dbSettingOrder, getOrderStateCode('UNKNOWN'));
    const actOrders = await searchDynamoDbStartsWith(productSetting, dbSettingOrder, getOrderStateCode('ACTIVE'));
    for (let order of [...unkOrders.items, ...actOrders.items]) {
      await deleteDynamoDb(productSetting, dbSettingOrder, getOrderSortKey(order.state, order.id, order.orderDate));
    }
  });
};