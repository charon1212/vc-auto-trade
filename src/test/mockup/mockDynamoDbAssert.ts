import { DbSetting } from "../../lib/lambda/Interfaces/AWS/Dynamodb/db";
import { dbSettingExecution, dbSettingLongExecution, dbSettingOrder, dbSettingProductContext, dbSettingLambdaExecutionLive } from "../../lib/lambda/Interfaces/AWS/Dynamodb/dbSettings";
import { ProductSetting } from "../../lib/lambda/Main/productSettings";
import { mockDynamoDb } from "./mockDynamoDb";

type MockObject = ReturnType<typeof mockDynamoDb>;
type Expectation = {
  putData: any[],
  deleteSortKey: string[],
};
type DynamoDbExpectations = {
  productContext: Expectation,
  execution: Expectation,
  longExecution: Expectation,
  order: Expectation,
  lambdaExecutionLive: Expectation,
};

export const mockDynamoDbAssert = (productSettings: ProductSetting[], mockObject: MockObject, expectations: DynamoDbExpectations) => {
  for (let productSetting of productSettings) {
    assertion(mockObject, expectations.productContext, productSetting, dbSettingProductContext);
    assertion(mockObject, expectations.execution, productSetting, dbSettingExecution);
    assertion(mockObject, expectations.longExecution, productSetting, dbSettingLongExecution);
    assertion(mockObject, expectations.order, productSetting, dbSettingOrder);
    assertion(mockObject, expectations.lambdaExecutionLive, productSetting, dbSettingLambdaExecutionLive);
  }
};

const assertion = (mockObject: MockObject, expectation: Expectation, productSetting: ProductSetting, dbSetting: DbSetting<any, any>) => {
  const targetPutCalls = mockObject.mockPutDynamoDb.mock.calls.filter((call) => (call[0].id === productSetting.id && call[1].id === dbSetting.id));
  expect(targetPutCalls.length).toBe(expectation.putData.length);
  for (let count = 0; count < expectation.putData.length; count++) {
    const put = expectation.putData[count];
    const call = targetPutCalls[count];
    expect(call).toBe([productSetting, dbSetting, put]);
  }
  const targetDeleteCalss = mockObject.mockDeleteDynamoDb.mock.calls.filter((call) => (call[0].id === productSetting.id && call[1].id === dbSetting.id));
  expect(targetDeleteCalss.length).toBe(expectation.deleteSortKey.length);
  for (let count = 0; count < expectation.deleteSortKey.length; count++) {
    const expected = expectation.putData[count];
    const actual = targetDeleteCalss[2];
    expect(actual).toBe(expected);
  }
};
