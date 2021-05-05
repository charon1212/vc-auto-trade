import saveExecutionHistory from "./ExecutionHistory/saveExecutionHistory";

exports.handler = async function (event: any) {

  const now = new Date();
  const before1min = new Date(now.getTime() - 60 * 1000);

  await saveExecutionHistory('XRP_JPY', before1min);

  return '';

};