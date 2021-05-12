import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as events from '@aws-cdk/aws-events';
import * as targets from '@aws-cdk/aws-events-targets';
import * as s3 from '@aws-cdk/aws-s3';
import * as dotenv from 'dotenv';
import { AttributeType, Table } from '@aws-cdk/aws-dynamodb';
import { Duration } from '@aws-cdk/core';

/**
 * 構築するインフラを定義する
 *
 * @param scope cdk.Stackを継承したクラス。
 * @param env 環境パラメータ。本番環境は空文字、開発環境はdevとする。
 */
export const stackConstructor = (scope: cdk.Construct, env: string) => {

  dotenv.config(); // load .env file.
  const accessKey = process.env.AKEY || '';
  const secretAccessKey = process.env.SKEY || '';

  const isProduction = (env === '');
  const envName = isProduction ? 'production' : 'dev';

  const dynamoTable = new Table(scope, 'vcAutoTrade' + env, {
    partitionKey: {
      name: 'ClassType',
      type: AttributeType.STRING,
    },
    sortKey: {
      name: 'SortKey',
      type: AttributeType.STRING,
    },
    tableName: 'vcAutoTrade' + env,
    removalPolicy: cdk.RemovalPolicy.RETAIN,
  });

  const s3Bucket = new s3.Bucket(scope, 'vcAutoTradeBucket' + env, {
    bucketName: 'vc-auto-trade-backet' + env,
  });

  /** メインの処理バッチ */

  const funcTimeoutSeconds = isProduction ? 10 : 5;
  const func = new lambda.Function(scope, 'MainHandler' + env, {
    runtime: lambda.Runtime.NODEJS_14_X,
    code: lambda.Code.fromAsset('lib/lambda'),
    handler: 'main.handler',
    environment: {
      TableName: dynamoTable.tableName,
      EnvName: envName,
      AKEY: accessKey,
      SKEY: secretAccessKey,
      LogLevel: 'DEBUG',
    },
    timeout: (Duration.seconds(funcTimeoutSeconds) as any),
  });

  dynamoTable.grantFullAccess(func);

  const rule = new events.Rule(scope, 'rule' + env, {
    schedule: events.Schedule.cron({ minute: '*/1', hour: '*', day: '*', month: '*', year: '*' }),
  });
  rule.addTarget(new targets.LambdaFunction(func, {}));

  /** データ移行バッチ */
  const funcTransDynamoData = new lambda.Function(scope, 'TransDynamoDataHandler' + env, {
    runtime: lambda.Runtime.NODEJS_14_X,
    code: lambda.Code.fromAsset('lib/lambda'),
    handler: 'transDynamoData.handler',
    environment: {
      TableName: dynamoTable.tableName,
      BucketName: s3Bucket.bucketName,
      EnvName: envName,
    },
    timeout: Duration.seconds(60) as any,
    memorySize: 1024,
  });

  s3Bucket.grantReadWrite(funcTransDynamoData as any); // なぜか型エラーが出て解決できない。。。苦肉のAs any。
  dynamoTable.grantReadData(funcTransDynamoData);

  const ruleTransDynamoData = new events.Rule(scope, 'ruleTransDynamoData' + env, {
    schedule: events.Schedule.cron({ minute: '0', hour: '1', day: '*', month: '*', year: '*' }), // 毎日午前10時(UTC 1時)に実施
  });
  ruleTransDynamoData.addTarget(new targets.LambdaFunction(funcTransDynamoData, {}));

}