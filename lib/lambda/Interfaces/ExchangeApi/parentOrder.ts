import { sendParentOrder } from "./Bitflyer/sendParentOrder";
import { getOrderSize } from "./order";

export type ChildOrder = {
  conditionType: ConditionType,
  side: 'BUY' | 'SELL',
  sizeByUnit: number,
  price?: number,
  triggerPrice?: number,
  offset?: number,
};
export type ConditionType = 'LIMIT' | 'MARKET' | 'STOP' | 'STOP_LIMIT' | 'TRAIL';

/**
 * 通常の特殊注文を行う。
 * @param productCode プロダクトコード。
 * @param childOrder 注文。
 * @returns 親注文の受付ID。
 */
export const sendSimpleOrder = async (productCode: string, childOrder: ChildOrder) => {

  const childOrderBitflyer = await convertBitflyerChildOrder(productCode, childOrder);
  if (!childOrderBitflyer) return undefined;

  const result = await sendParentOrder({
    order_method: 'SIMPLE',
    parameters: [childOrderBitflyer],
  });
  return result?.parent_order_acceptance_id;

};

/**
 * If Done 注文を行う。
 * @param productCode プロダクトコード。
 * @param firstChildOrder 最初に注文する注文。
 * @param secondChildOrder 最初の注文が約定した後に発注する注文。
 * @returns 親注文の受付ID。
 */
export const sendIfDoneOrder = async (productCode: string, firstChildOrder: ChildOrder, secondChildOrder: ChildOrder) => {

  const firstChildOrderBitflyer = await convertBitflyerChildOrder(productCode, firstChildOrder);
  if (!firstChildOrderBitflyer) return undefined;
  const secondChildOrderBitflyer = await convertBitflyerChildOrder(productCode, secondChildOrder);
  if (!secondChildOrderBitflyer) return undefined;

  const result = await sendParentOrder({
    order_method: 'IFD',
    parameters: [firstChildOrderBitflyer, secondChildOrderBitflyer],
  });
  return result?.parent_order_acceptance_id;

};

/**
 * One Cancels the Other 注文を行う。どちらかの注文が約定すると自動的に他方の注文がキャンセルされる。
 * @param productCode プロダクトコード。
 * @param firstChildOrder 1つめの注文。
 * @param secondChildOrder 2つめの注文。
 * @returns 親注文の受付ID。
 */
export const sendOneCancelsTheOtherOrder = async (productCode: string, firstChildOrder: ChildOrder, secondChildOrder: ChildOrder) => {

  const firstChildOrderBitflyer = await convertBitflyerChildOrder(productCode, firstChildOrder);
  if (!firstChildOrderBitflyer) return undefined;
  const secondChildOrderBitflyer = await convertBitflyerChildOrder(productCode, secondChildOrder);
  if (!secondChildOrderBitflyer) return undefined;

  const result = await sendParentOrder({
    order_method: 'OCO',
    parameters: [firstChildOrderBitflyer, secondChildOrderBitflyer],
  });
  return result?.parent_order_acceptance_id;

};

/**
 * If Done + One Cancels the Other 注文を行う。最初の注文が約定すると、残る2つのOCO注文を発注する。
 * @param productCode プロダクトコード。
 * @param firstChildOrder 最初の注文。
 * @param secondChildOrder 最初の注文の約定後の注文1。
 * @param secondChildOrder2 最初の注文の約定後の注文2。
 * @returns 親注文の受付ID。
 */
export const sendIFDOCOOrder = async (productCode: string, firstChildOrder: ChildOrder, secondChildOrder1: ChildOrder, secondChildOrder2: ChildOrder) => {

  const firstChildOrderBitflyer = await convertBitflyerChildOrder(productCode, firstChildOrder);
  if (!firstChildOrderBitflyer) return undefined;
  const secondChildOrderBitflyer1 = await convertBitflyerChildOrder(productCode, secondChildOrder1);
  if (!secondChildOrderBitflyer1) return undefined;
  const secondChildOrderBitflyer2 = await convertBitflyerChildOrder(productCode, secondChildOrder2);
  if (!secondChildOrderBitflyer2) return undefined;

  const result = await sendParentOrder({
    order_method: 'IFDOCO',
    parameters: [firstChildOrderBitflyer, secondChildOrderBitflyer1, secondChildOrderBitflyer2,],
  });
  return result?.parent_order_acceptance_id;

};

const convertBitflyerChildOrder = async (productCode: string, childOrder: ChildOrder,) => {

  const size = await getOrderSize(productCode, childOrder.sizeByUnit);
  if (!size) return undefined;

  return {
    product_code: productCode,
    condition_type: childOrder.conditionType,
    side: childOrder.side,
    size: size,
    price: childOrder.price,
    trigger_price: childOrder.triggerPrice,
    offset: childOrder.offset,
  };

};