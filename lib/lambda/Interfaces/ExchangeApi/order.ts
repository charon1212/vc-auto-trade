import { getOrders, OrderBitflyer } from "./Bitflyer/getOrders";
import { Order, OrderState } from '../DomainType';
import handleError from "../../HandleError/handleError";
import { getProductSetting } from "../../Main/productSettings";
import { sendOrder as sendOrderBitflyer } from "./Bitflyer/sendOrder";
import { cancelOrder as cancelOrderBitflyer } from './Bitflyer/cancelOrder';

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
 * @param productCode プロダクトコード。
 * @returns 注文の一覧。
 */
export const getAllOrders = async (productCode: string): Promise<GetChildOrderResult[]> => {

  const orders = await getOrders(productCode);
  return orders.map((order) => convertOrder(order));

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
 * @param productCode プロダクトコード。
 * @param state 検索対象の状態。
 * @returns 注文の一覧。
 */
export const getStateOrders = async (productCode: string, state: OrderStateExchangeApi): Promise<GetChildOrderResult[]> => {
  const orders = await getOrders(productCode, { child_order_state: state });
  return orders.map((order) => convertOrder(order));
};

export const getRelatedChildOrders = async (productCode: string, parentOrderId: string,): Promise<GetChildOrderResult[]> => {
  const orders = await getOrders(productCode, { parent_order_id: parentOrderId });
  return orders.map((order) => convertOrder(order));
};

/**
 * 注文を行う。
 * @param productCode プロダクトコード。
 * @param orderType 指値注文の場合はLIMIT、成行注文の場合はMARKET。
 * @param side 売り注文・買い注文を指定。
 * @param sizeUnit 注文数量。正の整数で指定。発注時、productSettingsで指定したorderUnitをかけて発注する。
 * @param price 指値の価格。
 * @returns 注文受付ID。エラー時はundefined。
 */
export const sendOrder = async (productCode: string, orderType: 'LIMIT' | 'MARKET', side: 'BUY' | 'SELL', sizeUnit: number, price?: number) => {

  const size = await getOrderSize(productCode, sizeUnit);
  if (!size) return undefined;

  const result = await sendOrderBitflyer(productCode, { child_order_type: orderType, side, size, price });

  return result?.child_order_acceptance_id;

};

/**
 * 注文をキャンセルする。
 * @param productCode プロダクトコード。
 * @param orderId 注文ID。
 * @param orderAcceptanceId 注文受付ID。
 * @returns 成功時はtrue、失敗時はfalse。
 */
export const cancelOrder = async (productCode: string, orderId?: string, orderAcceptanceId?: string) => {

  if (!orderId && !orderAcceptanceId) {
    await handleError(__filename, 'cancelOrder', 'code', '注文IDか注文受付IDのいずれかは必須です', { productCode, orderId, orderAcceptanceId, });
    return false;
  }

  return await cancelOrderBitflyer(productCode, { child_order_id: orderId, child_order_acceptance_id: orderAcceptanceId });

};

/**
 * 実際の注文数量を取得する。
 *
 * @param productCode プロダクトコード。
 * @param sizeByUnit 最小単位を単位とした注文数量。正の整数で指定する。
 * @returns 最小単位の整数倍で表した注文数量。
 */
export const getOrderSize = async (productCode: string, sizeByUnit: number) => {

  const productSetting = getProductSetting(productCode);
  if (!productSetting) {
    await handleError(__filename, 'getOrderSize', 'code', 'プロダクトコードが見つかりません。', { productCode, sizeByUnit, });
    return undefined;
  }

  // 丸目誤差の影響で端数が残ることがあり、端数が残るとBitflyerAPIにはじかれる。それを直すため、10桁目で四捨五入する。
  const base = 1e9;
  const size = Math.round(sizeByUnit * productSetting.orderUnit * base) / base;
  return size;

};
