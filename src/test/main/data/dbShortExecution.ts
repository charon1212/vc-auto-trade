import { ExecutionAggregated } from "../../../lib/lambda/Interfaces/DomainType";

export const dbShortExecution001 = (): ExecutionAggregated[][] => {
  const returnData: ExecutionAggregated[][] = [];
  const startTimestamp = 1577847600; // 2020年1月1日12:00:00
  for (let i = 0; i < 24*60; i++) {
    const array: ExecutionAggregated[] = [];
    for (let j = 0; j < 6; j++) {
      array.push({ timestamp: startTimestamp + (i * 60000 + j * 10000), price: (100 + i + 0.01 * j), buySize: 0.1, sellSize: 0.1, totalSize: 0.2 });
    }
    returnData.push(array);
  }
  return returnData;
};
