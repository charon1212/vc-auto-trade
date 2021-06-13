import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as events from '@aws-cdk/aws-events';
import * as targets from '@aws-cdk/aws-events-targets';
import * as s3 from '@aws-cdk/aws-s3';
import * as dotenv from 'dotenv';
import { AttributeType, Table } from '@aws-cdk/aws-dynamodb';
import { Duration } from '@aws-cdk/core';
import { LayerVersion } from '@aws-cdk/aws-lambda';

/**
 * 構築するインフラを定義する
 *
 * @param scope cdk.Stackを継承したクラス。
 * @param env 環境パラメータ。本番環境は空文字、開発環境はdevとする。
 */
export const stackConstructor = (scope: cdk.Construct, env: string) => {

  dotenv.config(); // load .env file.
  const { accessKey, secretAccessKey, slackBotToken, slackChannelProdError, slackChannelProdInfo, slackChannelDevError, slackChannelDevInfo, awsLayerArnList, } = getEnvSettings();

  const isProduction = (env === '');
  const envName = isProduction ? 'production' : 'dev';
  const layerArnList = awsLayerArnList.split(',');

  const slackChannelInfo = isProduction ? slackChannelProdInfo : slackChannelDevInfo;
  const slackChannelError = isProduction ? slackChannelProdError : slackChannelDevError;

  /** ■■Dynamo DB■■ */
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

  /** ■■S3 Bucket■■ */
  const s3Bucket = new s3.Bucket(scope, 'vcAutoTradeBucket' + env, {
    bucketName: 'vc-auto-trade-backet' + env,
  });

  /** Lambdaの環境変数 */
  const lambdaEnvVariables = {
    TableName: dynamoTable.tableName,
    BucketName: s3Bucket.bucketName,
    EnvName: envName,
    AKEY: accessKey,
    SKEY: secretAccessKey,
    LogLevel: isProduction ? 'ERROR' : 'ERROR',
    slackBotToken,
    slackChannelInfo,
    slackChannelError,
  };

  /** ■■Lambda(メインハンドラー)■■ */
  const funcMain = makeLambdaFunc({
    scope,
    id: 'MainHandler' + env,
    codeDirPath: 'lib/lambda',
    handler: 'main.handler',
    environment: lambdaEnvVariables,
    timeoutSecond: isProduction ? 10 : 5,
    schedule: {
      id: 'rule' + env,
      cron: { minute: '*/1', hour: '*', day: '*', month: '*', year: '*' },
    },
    layersArn: layerArnList,
  });
  dynamoTable.grantFullAccess(funcMain);

  /** ■■Lambda(データ移行バッチ)■■ */
  const funcTransDynamoData = makeLambdaFunc({
    scope,
    id: 'TransDynamoDataHandler' + env,
    codeDirPath: 'lib/lambda',
    handler: 'transDynamoData.handler',
    environment: lambdaEnvVariables,
    timeoutSecond: 60,
    memorySize: 1024,
    schedule: {
      id: 'ruleTransDynamoData' + env,
      cron: { minute: '0', hour: '1', day: '*', month: '*', year: '*' }
    },
    layersArn: layerArnList,
  });
  s3Bucket.grantReadWrite(funcTransDynamoData as any); // なぜか型エラーが出て解決できない。。。苦肉のAs any。
  dynamoTable.grantReadData(funcTransDynamoData);

  /** ■■Lambda(開発環境用のテストハンドラー)■■ */
  if (!isProduction) {
    const funcDevelopmentTest = makeLambdaFunc({
      scope,
      id: 'DevelopmentTestHandler' + env,
      codeDirPath: 'lib/lambda',
      handler: 'developmentTest.handler',
      environment: lambdaEnvVariables,
      timeoutSecond: 60,
      memorySize: 1024,
      layersArn: layerArnList,
    });
    dynamoTable.grantFullAccess(funcDevelopmentTest);
  }

};

const getEnvSettings = () => {
  const accessKey = process.env.AKEY || '';
  const secretAccessKey = process.env.SKEY || '';
  const slackBotToken = process.env.SLACK_API_PROD_BOT_AUTH_TOKEN || '';
  const slackChannelProdError = process.env.SLACK_API_PROD_ERRORREPORT_CHANNEL || '';
  const slackChannelProdInfo = process.env.SLACK_API_PROD_INFOREPORT_CHANNEL || '';
  const slackChannelDevError = process.env.SLACK_API_DEV_ERRORREPORT_CHANNEL || '';
  const slackChannelDevInfo = process.env.SLACK_API_DEV_INFOREPORT_CHANNEL || '';
  const awsLayerArnList = process.env.AWS_LAYER_ARN_LIST || '';

  const obj = { accessKey, secretAccessKey, slackBotToken, slackChannelProdError, slackChannelProdInfo, slackChannelDevError, slackChannelDevInfo, awsLayerArnList, };

  Object.values(obj).forEach((v) => {
    if (!v) throw new Error('設定値が足りません。'); // falsyな値がないかチェック。
  });

  return obj;
}

type LambdaProp = {
  scope: cdk.Construct,
  id: string,
  codeDirPath: string,
  handler: string,
  environment: { [key: string]: string; },
  timeoutSecond?: number,
  memorySize?: number,
  schedule?: {
    id: string,
    cron: events.CronOptions,
  },
  layersArn?: string[],
};

/**
 * Lambda関数を構築する。
 * @param params.scope lambda.Functionのコンストラクタ第1引数に渡すscope。
 * @param params.id lambda.Functionのコンストラクタ第2引数に渡すID。このLambda関数を表す一意識別子で、多分同一AWSアカウント内で被らないように設定する。
 * @param params.codeDirPath lambda関数に渡すコードアセットのディレクトリ。プロジェクトディレクトリからの相対パス。
 * @param params.handler ハンドラーのファイル名と関数名。
 * @param params.environment Lambda関数の環境変数。
 * @param params.timeoutSecond タイムアウト。秒数で指定する。
 * @param params.memorySize メモリサイズ。
 * @param params.schedule Cloud Watch Eventで定期実行する場合は指定する。IDは構築するCloud Watch Eventの一意識別子。cronは定期実行のタイミングを表すcron。例：{ minute: '0', hour: '0', day: '*', month: '*', year: '*' }は毎日AM９時(UTC 0時)に定期実行する。
 * @param params.layersArn lambda関数に設定するAWS Lambda LayerのARNの配列
 * @returns 構築したLambda関数。
 */
const makeLambdaFunc = (params: LambdaProp) => {
  const { scope, id, codeDirPath, handler, environment, timeoutSecond, memorySize, layersArn, } = params;

  const timeout = (timeoutSecond === undefined) ? undefined : Duration.seconds(timeoutSecond);
  const layers = layersArn?.map((arn) => (LayerVersion.fromLayerVersionArn(scope, id + '-layer-' + arn, arn)));

  const func = new lambda.Function(scope, id, {
    runtime: lambda.Runtime.NODEJS_14_X,
    code: lambda.Code.fromAsset(codeDirPath),
    handler: handler,
    environment: environment,
    timeout: timeout as any,
    memorySize: memorySize,
    layers: layers,
  });

  if (params.schedule) {
    const rule = new events.Rule(scope, params.schedule.id, {
      schedule: events.Schedule.cron(params.schedule.cron),
    });
    rule.addTarget(new targets.LambdaFunction(func));
  }

  return func;
};
