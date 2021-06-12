import { getOrders, OrderBitflyer } from "./Bitflyer/getOrders";
import { Order, OrderState } from '../DomainType';
import handleError from "../../HandleError/handleError";
import { getProductSetting, ProductCode, ProductSetting } from "../../Main/productSettings";
import { sendOrder as sendOrderBitflyer } from "./Bitflyer/sendOrder";
import { cancelOrder as cancelOrderBitflyer } from './Bitflyer/cancelOrder';
import { appLogger } from "../../Common/log";

export type GetChildOrderResult = {
  id: number,
  orderId: string,
  acceptanceId: string,
  averagePrice?: number,
  state: OrderState,
  outstandingSize: number,
  cancelSize: number,
  executedSize: number,
};

/**
 * 全ての注文の一覧を取得する。
 * @param productSetting プロダクト設定。
 * @returns 注文の一覧。
 */
export const getAllOrders = async (productSetting: ProductSetting): Promise<GetChildOrderResult[]> => {

  appLogger.info(`★★${productSetting.id}-API-getAllOrders-CALL`);
  const orders = await getOrders(productSetting.productCode);
  const result = orders.map((order) => convertOrder(order));
  appLogger.info(`★★${productSetting.id}-API-getAllOrders-RESULT-${JSON.stringify({ result })}`);
  return result;

};

/**
 * BitflyerのOrderをGetChildOrderResultに変換する。
 */
const convertOrder = (order: OrderBitflyer): GetChildOrderResult => {
  return {
    id: order.id,
    orderId: order.child_order_id,
    acceptanceId: order.child_order_acceptance_id,
    averagePrice: order.average_price,
    state: order.child_order_state,
    outstandingSize: order.outstanding_size,
    cancelSize: order.cancel_size,
    executedSize: order.executed_size,
  };
}

export type OrderStateExchangeApi = 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'REJECTED' | 'COMPLETED'

/**
 * 特定の状態の注文の一覧を取得する。
 * @param productSetting プロダクト設定。
 * @param state 検索対象の状態。
 * @returns 注文の一覧。
 */
export const getStateOrders = async (productSetting: ProductSetting, state: OrderStateExchangeApi): Promise<GetChildOrderResult[]> => {
  appLogger.info(`★★${productSetting.id}-API-getStateOrders-CALL-${JSON.stringify({ state, })}`);
  const orders = await getOrders(productSetting.productCode, { child_order_state: state });
  const result = orders.map((order) => convertOrder(order));
  appLogger.info(`★★${productSetting.id}-API-getStateOrders-RESULT-${JSON.stringify({ result, })}`);
  return result;
};

/**
 * 特定の注文を取得する。
 * @param productSetting プロダクト設定。
 * @param orderId 検索対象の注文ID。
 * @param acceptanceId 検索対象の受付ID。
 * @returns 特定の注文。配列形式で返却する。
 */
export const getOrder = async (productSetting: ProductSetting, orderId?: string, acceptanceId?: string) => {
  appLogger.info(`★★${productSetting.id}-API-getOrder-CALL-${JSON.stringify({ orderId, acceptanceId, })}`);
  const orders = await getOrders(productSetting.productCode, { child_order_id: orderId, child_order_acceptance_id: acceptanceId });
  const result = orders.map((order) => convertOrder(order));
  appLogger.info(`★★${productSetting.id}-API-getOrder-RESULT-${JSON.stringify({ result, })}`);
  return result;
};

/**
 * 特定の親注文に関連する子注文の一覧を取得する。
 * @param productSetting プロダクト設定。
 * @param parentOrderId 親注文の注文ID。
 * @returns 関連する子注文の一覧。
 */
export const getRelatedChildOrders = async (productSetting: ProductSetting, parentOrderId: string,): Promise<GetChildOrderResult[]> => {
  appLogger.info(`★★${productSetting.id}-API-getRelatedChildOrders-CALL-${JSON.stringify({ parentOrderId, })}`);
  const orders = await getOrders(productSetting.productCode, { parent_order_id: parentOrderId });
  const result = orders.map((order) => convertOrder(order));
  appLogger.info(`★★${productSetting.id}-API-getRelatedChildOrders-RESULT-${JSON.stringify({ result, })}`);
  return result;
};

/**
 * 注文を行う。
 * @param productSetting プロダクト設定
 * @param orderType 指値注文の場合はLIMIT、成行注文の場合はMARKET。
 * @param side 売り注文・買い注文を指定。
 * @param sizeUnit 注文数量。正の整数で指定。発注時、productSettingsで指定したorderUnitをかけて発注する。
 * @param price 指値の価格。
 * @returns 注文受付ID。エラー時はundefined。
 */
export const sendOrder = async (productSetting: ProductSetting, orderType: 'LIMIT' | 'MARKET', side: 'BUY' | 'SELL', sizeUnit: number, price?: number) => {

  appLogger.info(`★★${productSetting.id}-API-sendOrder-CALL-${JSON.stringify({ orderType, side, sizeUnit, price, })}`);
  const size = await getOrderSize(productSetting, sizeUnit);
  if (!size) return undefined;

  const result = await sendOrderBitflyer(productSetting.productCode, { child_order_type: orderType, side, size, price });

  if (!result) return undefined;
  const order: Order = {
    acceptanceId: result.child_order_acceptance_id,
    orderDate: new Date(),
    state: 'UNKNOWN',
    parentSortMethod: 'NORMAL',
    childOrderList: [{
      orderType,
      side,
      size,
      state: 'UNKNOWN',
      price,
    }],
  };
  appLogger.info(`★★${productSetting.id}-API-sendOrder-RESULT-${JSON.stringify({ result: order, })}`);
  return order;

};

/**
 * 注文をキャンセルする。
 * @param productSetting プロダクト設定。
 * @param orderId 注文ID。
 * @param orderAcceptanceId 注文受付ID。
 * @returns 成功時はtrue、失敗時はfalse。
 */
export const cancelOrder = async (productSetting: ProductSetting, orderId?: string, orderAcceptanceId?: string) => {

  appLogger.info(`★★${productSetting.id}-API-cancelOrder-CALL-${JSON.stringify({ orderId, orderAcceptanceId, })}`);
  if (!orderId && !orderAcceptanceId) {
    await handleError(__filename, 'cancelOrder', 'code', '注文IDか注文受付IDのいずれかは必須です', { productSetting, orderId, orderAcceptanceId, });
    return false;
  }

  const result = await cancelOrderBitflyer(productSetting.productCode, { child_order_id: orderId, child_order_acceptance_id: orderAcceptanceId });
  appLogger.info(`★★${productSetting.id}-API-cancelOrder-RESULT-${JSON.stringify({ result, })}`);
  return result;

};

/**
 * 実際の注文数量を取得する。
 *
 * @param productSetting プロダクト設定。
 * @param sizeByUnit 最小単位を単位とした注文数量。正の整数で指定する。
 * @returns 最小単位の整数倍で表した注文数量。
 */
export const getOrderSize = async (productSetting: ProductSetting, sizeByUnit: number) => {

  if (!productSetting) {
    await handleError(__filename, 'getOrderSize', 'code', 'プロダクトコードが見つかりません。', { productSetting, sizeByUnit, });
    return undefined;
  }

  // 丸目誤差の影響で端数が残ることがあり、端数が残るとBitflyerAPIにはじかれる。それを直すため、10桁目で四捨五入する。
  const base = 1e9;
  const size = Math.round(sizeByUnit * productSetting.orderUnit * base) / base;
  return size;

};
