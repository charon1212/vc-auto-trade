import { getOrders } from "./Bitflyer/getOrders";
import { Order } from '../DomainType';
import handleError from "../../HandleError/handleError";
import { getProductSetting } from "../../Main/productSettings";
import { sendOrder as sendOrderBitflyer } from "./Bitflyer/sendOrder";
import { cancelOrder as cancelOrderBitflyer } from './Bitflyer/cancelOrder';

/**
 * 全ての注文の一覧を取得する。
 * @param productCode プロダクトコード。
 * @returns 注文の一覧。
 */
export const getAllOrders = async (productCode: string): Promise<Order[]> => {

  const orders = await getOrders(productCode);
  return orders.map((order) => ({
    id: order.id,
    side: order.side,
    childOrderType: order.child_order_type,
    price: order.price,
    averagePrice: order.average_price,
    size: order.size,
    state: order.child_order_state,
    expireDate: order.expire_date,
    orderDate: order.child_order_date,
    acceptanceId: order.child_order_acceptance_id,
    outstandingSize: order.outstanding_size,
    cancelSize: order.cancel_size,
    executedSize: order.executed_size,
  }));

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

  const productSetting = getProductSetting(productCode);
  if (!productSetting) {
    await handleError(__filename, 'sendOrder', 'code', 'プロダクトコードが見つかりません。', { productCode, orderType, side, price, sizeUnit, });
    return undefined;
  }

  // 丸目誤差の影響で端数が残ることがあり、端数が残るとBitflyerAPIにはじかれる。それを直すため、10桁目で四捨五入する。
  const base = 1e9;
  const size = Math.round(sizeUnit * productSetting.orderUnit * base) / base;

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