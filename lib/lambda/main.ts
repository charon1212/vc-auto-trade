import { entry } from './Main/entry';

exports.handler = async function (event: any) {

  const res = await entry();
  return res;

};