import { Balance } from '../DomainType';
import { getBalances as getBalancesBitflyer } from './Bitflyer/getBalances';

/**
 * 資産残高の一覧を取得する。
 * @returns 資産残高の一覧。
 */
export const getBalances = async (): Promise<Balance[]> => {

  const res = await getBalancesBitflyer();
  return res.map((value) => ({
    currencyCode: value.currency_code,
    amount: value.amount,
    available: value.available,
  }));

};