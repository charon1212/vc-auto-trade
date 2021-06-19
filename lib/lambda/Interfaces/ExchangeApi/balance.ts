import { appLogger } from '../../Common/log';
import { ExchangeCode } from '../../Main/productSettings';
import { Balance } from '../DomainType';
import { getBalances as getBitflyerBalances } from './Bitflyer/getBalances';
import { getAssets } from './GMO/getAssets';

/**
 * 資産残高の一覧を取得する。
 * @returns 資産残高の一覧。
 */
export const getBalances = async (exchangeCode: ExchangeCode): Promise<Balance[]> => {

  appLogger.info2(`★★API-getBalances-CALL`);
  let result: Balance[] = [];
  if (exchangeCode === 'Bitflyer') {
    result = await getBalancesBitflyer();
  } else if (exchangeCode === 'GMO') {
    result = await getBalancesGmo();
  }
  appLogger.info2(`★★API-getBalances-RESULT-${JSON.stringify({ result })}`);
  return result;

};

const getBalancesGmo = async () => {

  const res = await getAssets();
  const result = res.map((value) => ({
    currencyCode: value.symbol,
    amount: value.amount,
    available: value.available,
  }));
  return result;

};

const getBalancesBitflyer = async () => {

  const res = await getBitflyerBalances();
  const result = res.map((value) => ({
    currencyCode: value.currency_code,
    amount: value.amount,
    available: value.available,
  }));
  return result;

};
