import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as events from '@aws-cdk/aws-events';
import * as targets from '@aws-cdk/aws-events-targets';
import * as s3 from '@aws-cdk/aws-s3';
import * as dotenv from 'dotenv';
import { AttributeType, Table } from '@aws-cdk/aws-dynamodb';


export class VcAutoTradeStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    dotenv.config(); // load .env file.
    const accessKey = process.env.AKEY || '';
    const secretAccessKey = process.env.SKEY || '';

    const dynamoTable = new Table(this, 'vcAutoTrade', {
      partitionKey: {
        name: 'ClassType',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'SortKey',
        type: AttributeType.STRING,
      },
      tableName: 'vcAutoTrade',
      removalPolicy: cdk.RemovalPolicy.RETAIN, // NOT recommended for production code
    });

    const s3Bucket = new s3.Bucket(this, 'vcAutoTradeBucket', {
      bucketName: 'vc-auto-trade-backet',
    });

    /** メインの処理バッチ */

    const func = new lambda.Function(this, 'MainHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('lib/lambda'),
      handler: 'main.handler',
      environment: {
        TableName: dynamoTable.tableName,
        AKEY: accessKey,
        SKEY: secretAccessKey,
      },
    });

    dynamoTable.grantFullAccess(func);

    const rule = new events.Rule(this, 'rule', {
      schedule: events.Schedule.cron({ minute: '*/1', hour: '*', day: '*', month: '*', year: '*' }),
    });
    rule.addTarget(new targets.LambdaFunction(func, {}));

    /** データ移行バッチ */

    const funcTransDynamoData = new lambda.Function(this, 'TransDynamoDataHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('lib/lambda'),
      handler: 'transDynamoData.handler',
      environment: {
        BucketName: s3Bucket.bucketName,
      },
    });

    s3Bucket.grantReadWrite(funcTransDynamoData as any); // なぜか型エラーが出て解決できない。。。苦肉のAs any。

    const ruleTransDynamoData = new events.Rule(this, 'ruleTransDynamoData', {
      schedule: events.Schedule.cron({ minute: '0', hour: '1', day: '*', month: '*', year: '*' }), // 毎日午前10時(UTC 1時)に実施
    });
    ruleTransDynamoData.addTarget(new targets.LambdaFunction(funcTransDynamoData, {}));

  }
}
