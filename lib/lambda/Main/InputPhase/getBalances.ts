import { getBalances as getBalancesApi } from '../../Interfaces/ExchangeApi/balance';

export const getBalances = async (currencyCodeReal: string, currencyCodeVirtual: string,) => {

  const balances = await getBalancesApi();
  return {
    balanceReal: balances.find((balance) => (balance.currencyCode === currencyCodeReal)),
    balanceVirtual: balances.find((balance) => (balance.currencyCode === currencyCodeVirtual)),
  }

};