import { getOrders as getBitflyerOrders, OrderBitflyer, OrderStateBitflyer } from "./Bitflyer/getOrders";
import { SimpleOrder, OrderState } from '../DomainType';
import handleError from "../../HandleError/handleError";
import { ExchangeCode, ProductSetting } from "../../Main/productSettings";
import { sendOrder as sendBitflyerOrder } from "./Bitflyer/sendOrder";
import { cancelOrder as cancelBitflyerOrder } from './Bitflyer/cancelOrder';
import { cancelOrder as cancelGmoOrder } from './GMO/cancelOrder';
import { appLogger } from "../../Common/log";
import { getOrders as getGmoOrders, OrderStatusGMO } from './GMO/getOrders';
import { sendOrder as sendGmoOrder } from './GMO/sendOrder';

export const getOrders = async (productSetting: ProductSetting, orders: SimpleOrder[]) => {
  appLogger.info2(`★★${productSetting.id}-API-getAllOrders-CALL`);
  let newOrders: SimpleOrder[] = [];
  if (productSetting.exchangeCode === 'Bitflyer') {
    newOrders = await getOrdersBitflyer(productSetting, orders);
  } else if (productSetting.exchangeCode === 'GMO') {
    newOrders = await getOrdersGmo(orders);
  }
  appLogger.info2(`★★${productSetting.id}-API-getAllOrders-RESULT-${JSON.stringify({ newOrders })}`);
  return newOrders;
};

const getOrdersBitflyer = async (productSetting: ProductSetting, orders: SimpleOrder[]) => {
  const newOrders: SimpleOrder[] = [];
  for (let order of orders) {
    const newOrder = await getBitflyerOrders(productSetting.productCode, { child_order_acceptance_id: order.idBitflyer?.acceptanceId });
    if (newOrder.length >= 1) {
      newOrders.push({
        ...order,
        state: convertBitflyerOrderState(newOrder[0].child_order_state),
        main: {
          ...order.main,
          averagePrice: newOrder[0].average_price,
        }
      });
    } else {
      newOrders.push({ ...order });
    }
  }
  return newOrders;
};
const convertBitflyerOrderState = (state: OrderStateBitflyer): OrderState => {
  if (state === 'ACTIVE') return 'ACTIVE';
  if (state === 'COMPLETED') return 'COMPLETED';
  if (state === 'CANCELED') return 'INVALID';
  if (state === 'EXPIRED') return 'INVALID';
  if (state === 'REJECTED') return 'INVALID';
  return 'UNKNOWN';
};

const getOrdersGmo = async (orders: SimpleOrder[]) => {
  const newOrders: SimpleOrder[] = [];
  for (let index = 0; index < orders.length; index += 10) { // 10件ごとに分割する
    const targetOrders = [...orders].splice(index, index + 10);
    const newGmoOrders = await getGmoOrders(targetOrders.map((order) => (order.idGmo?.toString() || '')));
    for (let order of targetOrders) {
      const newOrder = newGmoOrders.find((o) => (o.orderId === order.idGmo));
      if (newOrder) {
        newOrders.push({
          ...order,
          state: convertGmoOrderState(newOrder.status),
        });
      } else {
        newOrders.push({ ...order });
      }
    }
  }
  return newOrders;
};
const convertGmoOrderState = (state: OrderStatusGMO): OrderState => {
  if (state === 'WAITING') return 'ACTIVE';
  if (state === 'ORDERED') return 'ACTIVE';
  if (state === 'MODIFYING') return 'ACTIVE';
  if (state === 'CANCELLING') return 'INVALID';
  if (state === 'CANCELED') return 'INVALID';
  if (state === 'EXECUTED') return 'COMPLETED';
  if (state === 'EXPIRED') return 'INVALID';
  return 'UNKNOWN';
};

export const sendOrder = async (productSetting: ProductSetting, orderType: 'LIMIT' | 'MARKET', side: 'BUY' | 'SELL', sizeUnit: number, price?: number) => {

  appLogger.info2(`★★${productSetting.id}-API-sendOrder-CALL-${JSON.stringify({ productSetting, orderType, side, sizeUnit, price, })}`);
  let order: SimpleOrder | undefined = undefined;
  if (productSetting.exchangeCode === 'Bitflyer') {
    order = await sendOrderBitflyer(productSetting, orderType, side, sizeUnit, price,);
  } else if (productSetting.exchangeCode === 'GMO') {
    order = await sendOrderGmo(productSetting, orderType, side, sizeUnit, price,);
  }
  appLogger.info2(`★★${productSetting.id}-API-sendOrder-RESULT-${JSON.stringify({ order, })}`);
  return order;
};

export const sendOrderBitflyer = async (productSetting: ProductSetting, orderType: 'LIMIT' | 'MARKET', side: 'BUY' | 'SELL', sizeUnit: number, price?: number) => {
  const size = getOrderSize(productSetting, sizeUnit);
  if (!size) return undefined;

  const result = await sendBitflyerOrder(productSetting.productCode, { child_order_type: orderType, side, size, price });

  if (!result) return undefined;
  const orderId = 'Bitflyer-' + result.child_order_acceptance_id;
  const order: SimpleOrder = {
    id: orderId,
    idBitflyer: {
      acceptanceId: result.child_order_acceptance_id,
    },
    orderDate: new Date(),
    state: 'UNKNOWN',
    main: {
      orderType: orderType,
      side: side,
      size: size,
      price: price,
    },
  };
  return order;
};

export const sendOrderGmo = async (productSetting: ProductSetting, orderType: 'LIMIT' | 'MARKET', side: 'BUY' | 'SELL', sizeUnit: number, price?: number) => {
  const size = getOrderSize(productSetting, sizeUnit);
  if (!size) return undefined;

  const result = await sendGmoOrder({
    symbol: productSetting.productCode,
    executionType: orderType,
    side, size, price,
  });

  if (!result) return undefined;
  const orderId = 'GMO-' + result.data;
  const order: SimpleOrder = {
    id: orderId,
    idGmo: result.data,
    orderDate: new Date(),
    state: 'UNKNOWN',
    main: {
      orderType: orderType,
      side: side,
      size: size,
      price: price,
    },
  };
  return order;
};

export const cancelOrder = async (productSetting: ProductSetting, order: SimpleOrder) => {

  appLogger.info2(`★★${productSetting.id}-API-cancelOrder-CALL-${JSON.stringify({ productSetting, order, })}`);
  let result: boolean = false;
  if (productSetting.exchangeCode === 'Bitflyer') {
    result = await cancelBitflyerOrder(productSetting.productCode, { child_order_acceptance_id: order.idBitflyer?.acceptanceId });
  } else if (productSetting.exchangeCode === 'GMO') {
    result = await cancelGmoOrder(order.idGmo!); // GMOの注文であれば、idGmoは必須…のはず。
  }
  appLogger.info2(`★★${productSetting.id}-API-cancelOrder-RESULT-${JSON.stringify({ result, })}`);
  return result;

};

/**
 * 実際の注文数量を取得する。
 *
 * @param productSetting プロダクト設定。
 * @param sizeByUnit 最小単位を単位とした注文数量。正の整数で指定する。
 * @returns 最小単位の整数倍で表した注文数量。
 */
export const getOrderSize = (productSetting: ProductSetting, sizeByUnit: number) => {

  // 丸目誤差の影響で端数が残ることがあり、端数が残るとBitflyerAPIにはじかれる。それを直すため、10桁目で四捨五入する。
  const base = 1e9;
  const size = Math.round(sizeByUnit * productSetting.orderUnit * base) / base;
  return size;

};
