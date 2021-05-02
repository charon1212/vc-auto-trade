import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as dynamo from '@aws-cdk/aws-dynamodb';
import * as events from '@aws-cdk/aws-events';
import * as targets from '@aws-cdk/aws-events-targets';
import * as dotenv from 'dotenv';


export class VcAutoTradeStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    dotenv.config(); // load .env file.
    const accessKey = process.env.AKEY || '';
    const secretAccessKey = process.env.SKEY || '';

    const l = new lambda.Function(this, 'MainHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('lib/lambda'),
      handler: 'main.handler',
      environment: {
        AKEY: accessKey,
        SKEY: secretAccessKey,
      },
    });

    const rule = new events.Rule(this, 'rule', {
      schedule: events.Schedule.cron({ minute: '*/5', hour: '*', day: '*', month: '*', year: '*' }),
    })
    rule.addTarget(new targets.LambdaFunction(l, {}));

  }
}
