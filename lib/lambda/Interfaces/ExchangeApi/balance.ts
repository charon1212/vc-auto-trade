import { appLogger } from '../../Common/log';
import { Balance } from '../DomainType';
import { getBalances as getBalancesBitflyer } from './Bitflyer/getBalances';

/**
 * 資産残高の一覧を取得する。
 * @returns 資産残高の一覧。
 */
export const getBalances = async (): Promise<Balance[]> => {

  appLogger.info(`★★API-getBalances-CALL`);
  const res = await getBalancesBitflyer();
  const result = res.map((value) => ({
    currencyCode: value.currency_code,
    amount: value.amount,
    available: value.available,
  }));
  appLogger.info(`★★API-getBalances-RESULT-${JSON.stringify({ result })}`);
  return result;

};