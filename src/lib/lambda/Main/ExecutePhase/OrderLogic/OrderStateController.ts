import { appLogger } from "../../../Common/log";
import { getNowTimestamp } from "../../../Common/util";
import { OrderPhase, SimpleOrder, VCATProductContext } from "../../../Interfaces/DomainType";
import { sendSlackMessage } from "../../../Interfaces/Slack/sendSlackMessage";
import { ProductSetting } from "../../productSettings";

/**
 * 注文に関する状態遷移のロジックをまとめる。
 */
export class OrderStateController {

  private context: VCATProductContext;
  private setting: ProductSetting;

  constructor(setting: ProductSetting, context: VCATProductContext) {
    this.setting = setting;
    this.context = context;
  }

  /**
   * 発注した注文が約定した場合
   */
  onOrderSuccess = async (buyOrderInfo?: { timestamp: number, price: number, amount: number }) => {
    const beforeOrderPhase = this.context.orderPhase;
    const afterOrderPhase = getNextOrderPhase(beforeOrderPhase);

    this.context.orderPhase = afterOrderPhase;
    this.context.afterSendOrder = false;
    this.context.orderId = undefined;
    this.context.buyOrderPrice = (beforeOrderPhase === 'Buy') ? buyOrderInfo?.price : undefined; // 互換性維持のためしばらくは残す。
    this.context.buyOrderInfo = (beforeOrderPhase === 'Buy') ? buyOrderInfo : undefined;

    appLogger.info1(`〇〇〇${this.setting.id}-ChangePhase-${beforeOrderPhase}→${afterOrderPhase}`);
    await sendSlackMessage(`★Order success. Phase: ${beforeOrderPhase} => ${afterOrderPhase}`, false);
  };

  /**
   * 発注した注文が失敗(キャンセルや期限切れ)した場合
   */
  onOrderFailed = async () => {
    this.context.afterSendOrder = false;
    this.context.orderId = undefined;
    appLogger.info1(`〇〇〇${this.setting.id}-FailOrder-${this.context.orderPhase}`);
    await sendSlackMessage(`★Order fail. Order phase is ${this.context.orderPhase}`, false);
  };

  onSendOrder = async (order: SimpleOrder, buyOrderPrice?: number,) => {
    this.context.afterSendOrder = true;
    this.context.orderId = order.id;
    appLogger.info1(`〇〇〇${this.setting.id}-SendOrder-${JSON.stringify({ order, buyOrderPrice })}`);
    await sendSlackMessage(`★Send order. Side: ${order.main.side}, Price: ${order.main.price || 'MARKET'}${buyOrderPrice ? `BuyPrice: ${buyOrderPrice}` : ''}`, false);
  };

  /**
   * 損切を実行した時
   */
  onStopLoss = async (order: SimpleOrder, restartTimeSpanMilliseconds?: number,) => {
    this.context.orderPhase = 'StopLoss';
    this.context.afterSendOrder = true;
    this.context.orderId = order.id;
    if (restartTimeSpanMilliseconds !== undefined) this.context.startBuyTimestamp = getNowTimestamp() + restartTimeSpanMilliseconds;
    appLogger.info1(`〇〇〇${this.setting.id}-ChangePhase-Sell→StopLoss`);
    await sendSlackMessage(`★Stop Loss.`, false);
  };

  onStartBuy = async () => {
    this.context.orderPhase = 'Buy';
    this.context.startBuyTimestamp = undefined;
    appLogger.info1(`〇〇〇${this.setting.id}-ChangePhase-Wait→Buy`);
    await sendSlackMessage(`★Start buy.`, false);
  };

}

const getNextOrderPhase = (phase?: OrderPhase): OrderPhase | undefined => {
  if (phase === 'Buy') return 'Sell';
  if (phase === 'Sell') return 'Buy';
  if (phase === 'StopLoss') return 'Wait';
  if (phase === 'Wait') return 'Buy';
  return undefined;
};
