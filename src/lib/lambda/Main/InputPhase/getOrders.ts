import { asyncExecution } from "../../Common/util";
import handleError from "../../HandleError/handleError";
import { searchDynamoDbStartsWith } from "../../Interfaces/AWS/Dynamodb/db";
import { dbSettingOrder, getOrderStateCode } from "../../Interfaces/AWS/Dynamodb/dbSettings";
import { SimpleOrder, OrderState } from "../../Interfaces/DomainType";
import { getAssociatedExecutions } from "../../Interfaces/ExchangeApi/getAssociatedExecutions";
import { getOrders as getOrdersApi } from "../../Interfaces/ExchangeApi/order";
import { ProductSetting } from "../productSettings";

export const getOrders = async (productSetting: ProductSetting,) => {

  // DynamoDBからオーダー一覧を取得する
  let activeOrderFromDb: SimpleOrder[] = [], unknownOrderFromDb: SimpleOrder[] = [];
  await asyncExecution(
    async () => { unknownOrderFromDb = (await searchDynamoDbStartsWith(productSetting, dbSettingOrder, getOrderStateCode('UNKNOWN'))).items },
    async () => { activeOrderFromDb = (await searchDynamoDbStartsWith(productSetting, dbSettingOrder, getOrderStateCode('ACTIVE'))).items },
  );

  const orderListFromDb: SimpleOrder[] = [];
  orderListFromDb.push(...unknownOrderFromDb);
  orderListFromDb.push(...activeOrderFromDb);

  const resultOrderList: { order: SimpleOrder, beforeState: OrderState }[] = [];

  const orderListFromApi = await getOrdersApi(productSetting, orderListFromDb);
  for (let order of orderListFromDb) {
    let orderFromApi = orderListFromApi.find((o) => (o.id === order.id));
    if (productSetting.exchangeCode === 'GMO' && orderFromApi && orderFromApi.state === 'COMPLETED') { // GMOコインの場合、平均取引価格を別途取得する。
      const associatedExecutions = await getAssociatedExecutions(productSetting, orderFromApi);
      let price = 0;
      let size = 0;
      for (let exec of associatedExecutions) {
        price += exec.price * exec.size;
        size += exec.size;
      }
      if (size < 1e-10) {
        await handleError(__filename, 'getOrders', 'code', '関連する約定を取得できませんでした。注文を完了状態に移行できません。', { productSetting, },);
        orderFromApi = undefined;
      } else {
        orderFromApi.main.averagePrice = price / size;
      }
    }
    resultOrderList.push({ order: orderFromApi || order, beforeState: order.state }); // API取得があればそれ、なければDB取得のOrder。
  }

  return resultOrderList;

};