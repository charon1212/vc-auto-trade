import { DbSetting, getClassType } from '../../lib/lambda/Interfaces/AWS/Dynamodb/db';
import { dbSettingProductContext } from '../../lib/lambda/Interfaces/AWS/Dynamodb/dbSettings';
import * as contextModule from '../../lib/lambda/Main/context';
import { entry } from '../../lib/lambda/Main/entry';
import * as productSettingsModule from "../../lib/lambda/Main/productSettings";
import { ProductSetting } from '../../lib/lambda/Main/productSettings';
import { DynamoDbRecord, mockDynamoDb } from '../mockup/mockDynamoDb';
import { DynamoDbExpectations, mockDynamoDbAssert } from '../mockup/mockDynamoDbAssert';
import { mockGmoApi } from '../mockup/mockGmoApi';
import { mockLog } from '../mockup/mockLog';
import { mockSendSlackMessage } from '../mockup/mockSendSlackmessage';
import { dbContext001 } from './data/dbContext';
import { productSetting001 } from './data/productSetting';

describe('メイン処理', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const testParams: MainTestParams[][] = [
    [{ sample1: 'abc', sample2: '1abc' }],
  ];
  it.each(testParams)('各サブテスト', async (param: MainTestParams) => {

    // 環境変数
    setProcessEnv();
    const { mockObjectDb, mockObjectApi, mockObjectLog, mockObjectSlack, spyGetProductSettings, productSetting, } = mockInput001();

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
    mockDynamoDbAssert([productSetting], mockObjectDb, [expectationsDb]);

  });
});

type MainTestParams = {
  sample1: string,
  sample2: string,
};

const mockInput001 = () => {
  const productSetting = productSetting001() as any;
  // DB
  const dbData001: DynamoDbRecord[] = [];
  dbData001.push(...(getDbMockData(productSetting, dbSettingProductContext, [dbContext001() as any])));

  const mockObjectDb = mockDynamoDb(dbData001 as any);
  // API
  const mockObjectApi = mockGmoApi({ assets: [], executions: [], orders: [], trades: [] });
  // ログ
  const mockObjectLog = mockLog();
  // Slack
  const mockObjectSlack = mockSendSlackMessage();
  // ProductSetting
  const spyGetProductSettings = jest.spyOn(productSettingsModule, 'getProductSettings').mockReturnValue([productSetting]);

  return {
    mockObjectDb,
    mockObjectApi,
    mockObjectLog,
    mockObjectSlack,
    spyGetProductSettings,
    productSetting,
  };
};

const getDbMockData = <T, DbType>(productSetting: ProductSetting, dbSetting: DbSetting<T, DbType>, data: T[]): DynamoDbRecord[] => {
  return data.map((d) => ({
    ClassType: getClassType(productSetting, dbSetting),
    SortKey: dbSetting.sortKey(d),
    data: d,
  }));
};

const setProcessEnv = () => {
  process.env.EnvName = 'dev';
  process.env.LogLevel = 'TRACE';
};
