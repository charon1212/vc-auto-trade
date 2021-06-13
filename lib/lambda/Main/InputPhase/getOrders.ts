import { appLogger } from "../../Common/log";
import { asyncExecution } from "../../Common/util";
import { searchOrders } from "../../Interfaces/AWS/Dynamodb/order";
import { SimpleOrder, OrderState } from "../../Interfaces/DomainType";
import { getParentOrderDetail } from "../../Interfaces/ExchangeApi/Bitflyer/getParentOrderDetail";
import { getAssociatedExecutions } from "../../Interfaces/ExchangeApi/getAssociatedExecutions";
import { getOrders as getOrdersApi } from "../../Interfaces/ExchangeApi/order";
import { ProductSetting } from "../productSettings";

export const getOrders = async (productSetting: ProductSetting,) => {

  // DynamoDBからオーダー一覧を取得する
  let activeOrderFromDb: SimpleOrder[] = [], unknownOrderFromDb: SimpleOrder[] = [];
  await asyncExecution(
    async () => { unknownOrderFromDb = (await searchOrders(productSetting.id, 'UNKNOWN')).result?.map((item) => item.data) || [] },
    async () => { activeOrderFromDb = (await searchOrders(productSetting.id, 'ACTIVE')).result?.map((item) => item.data) || [] },
  );

  const orderListFromDb: SimpleOrder[] = [];
  orderListFromDb.push(...unknownOrderFromDb);
  orderListFromDb.push(...activeOrderFromDb);

  const resultOrderList: { order: SimpleOrder, beforeState: OrderState }[] = [];

  const orderListFromApi = await getOrdersApi(productSetting, orderListFromDb);
  for (let order of orderListFromDb) {
    const orderFromApi = orderListFromApi.find((o) => (o.id === order.id));
    resultOrderList.push({ order: orderFromApi || order, beforeState: order.state }); // API取得があればそれ、なければDB取得のOrder。
    if (productSetting.exchangeCode === 'GMO' && orderFromApi && orderFromApi.state === 'COMPLETED') { // GMOコインの場合、平均取引価格を別途取得する。
      const associatedExecutions = await getAssociatedExecutions(productSetting, orderFromApi);
      let price = 0;
      let size = 0;
      for (let exec of associatedExecutions) {
        price += exec.price;
        size += exec.size;
      }
      orderFromApi.main.averagePrice = price / size;
    }
  }

  return resultOrderList;

};