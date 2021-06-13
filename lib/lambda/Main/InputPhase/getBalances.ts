import { getBalances as getBalancesApi } from '../../Interfaces/ExchangeApi/balance';
import { ExchangeCode } from '../productSettings';

export const getBalances = async (exchangeCode: ExchangeCode, currencyCodeReal: string, currencyCodeVirtual: string,) => {

  const balances = await getBalancesApi(exchangeCode);
  return {
    balanceReal: balances.find((balance) => (balance.currencyCode === currencyCodeReal)),
    balanceVirtual: balances.find((balance) => (balance.currencyCode === currencyCodeVirtual)),
  }

};