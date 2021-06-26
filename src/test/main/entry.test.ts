import * as contextModule from '../../lib/lambda/Main/context';
import { entry } from '../../lib/lambda/Main/entry';
import * as productSettingsModule from "../../lib/lambda/Main/productSettings";
import { mockDynamoDb } from '../mockup/mockDynamoDb';
import { DynamoDbExpectations, mockDynamoDbAssert } from '../mockup/mockDynamoDbAssert';
import { mockGmoApi } from '../mockup/mockGmoApi';
import { mockLog } from '../mockup/mockLog';
import { mockSendSlackMessage } from '../mockup/mockSendSlackmessage';

describe('メイン処理', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const testParams: MainTestParams[][] = [
    [{ sample1: 'abc', sample2: '1abc' }],
  ];
  it.each(testParams)('各サブテスト', async (param: MainTestParams) => {

    setProcessEnv();
    const mockObjectDb = mockDynamoDb(getSampleDynamoDbData());
    const mockObjectApi = mockGmoApi({ assets: [], executions: [], orders: [], trades: [] });
    const mockObjectLog = mockLog();
    const mockObjectSlack = mockSendSlackMessage();
    const spyGetProductSettings = jest.spyOn(productSettingsModule, 'getProductSettings').mockReturnValue([sampleProductSetting]);

    // テスト実行
    await entry();

    // アサーション
    const expectationsDb: DynamoDbExpectations = { productContext: { putData: [], deleteSortKey: [] }, execution: { putData: [], deleteSortKey: [] }, longExecution: { putData: [], deleteSortKey: [] }, order: { putData: [], deleteSortKey: [] }, lambdaExecutionLive: { putData: [], deleteSortKey: [] }, };
    expectationsDb.productContext.putData.push({
      orderPhase: 'Wait', afterSendOrder: false, executionSetting: {
        executePhase: false,
        executeMain: false,
        makeNewOrder: false,
      }
    });
    mockDynamoDbAssert([sampleProductSetting], mockObjectDb, expectationsDb);

  });
});

type MainTestParams = {
  sample1: string,
  sample2: string,
};

const sampleProductSetting: any = {
  id: 'TestProductId',
  currencyCode: { real: 'JPY', virtual: 'BTC' },
  exchangeCode: 'GMO',
  productCode: 'BTC',
  orderUnit: 0.0001,
  maxOrderSize: 100,
};

const getSampleDynamoDbData = () => {
  const dataList: { ClassType: string, SortKey: string, data: any }[] = [];
  // コンテキスト
  dataList.push({
    ClassType: 'TestProductIdCONTEXT', SortKey: 'context',
    data: {
      orderPhase: 'Wait', afterSendOrder: false, executionSetting: {
        executePhase: false,
        executeMain: false,
        makeNewOrder: false,
      }
    }
  });

  return dataList;
};

const setProcessEnv = () => {
  process.env.EnvName = 'dev';
  process.env.LogLevel = 'TRACE';
};
