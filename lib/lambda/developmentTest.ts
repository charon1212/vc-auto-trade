import { sendRequest } from "./Interfaces/ExchangeApi/Bitflyer/apiRequest";

exports.handler = async function (event: any) {

  const res = await sendRequest({
    uri: 'me/getbalance',
    method: 'GET',
  }, true);
  const json = await res?.json();
  console.log(json);

  return '';

};
