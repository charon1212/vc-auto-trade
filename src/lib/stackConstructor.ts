import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as events from '@aws-cdk/aws-events';
import * as targets from '@aws-cdk/aws-events-targets';
import * as apiGateway from '@aws-cdk/aws-apigateway';
import * as s3 from '@aws-cdk/aws-s3';
import * as dotenv from 'dotenv';
import { AttributeType, Table } from '@aws-cdk/aws-dynamodb';
import { Duration } from '@aws-cdk/core';
import { LayerVersion } from '@aws-cdk/aws-lambda';
import { ProcessEnv } from './lambda/Common/processEnv';

/**
 * 構築するインフラを定義する
 *
 * @param scope cdk.Stackを継承したクラス。
 * @param env 環境パラメータ。本番環境は空文字、開発環境はdevとする。
 */
export const stackConstructor = (scope: cdk.Construct, env: string) => {

  dotenv.config(); // load .env file.
  const { accessKeyBitflyer, secretAccessKeyBitflyer, accessKeyGmo, secretAccessKeyGmo, slackBotToken, slackChannelProdError, slackChannelProdInfo, slackChannelDevError, slackChannelDevInfo, awsLayerArnList, } = getEnvSettings();

  const isProduction = (env === '');
  const envName = isProduction ? 'production' : 'dev';
  const layerArnList = awsLayerArnList.split(',');
  const codeDirPath = 'dist/lib/lambda';

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
    readCapacity: 10,
    writeCapacity: 10,
  });

  /** ■■S3 Bucket■■ */
  const s3Bucket = new s3.Bucket(scope, 'vcAutoTradeBucket' + env, {
    bucketName: 'vc-auto-trade-backet' + env,
  });

  /** Lambdaの環境変数 */
  const lambdaEnvVariables: ProcessEnv = {
    TableName: dynamoTable.tableName,
    BucketName: s3Bucket.bucketName,
    EnvName: envName,
    akeyBitflyer: accessKeyBitflyer,
    skeyBitflyer: secretAccessKeyBitflyer,
    akeyGmo: accessKeyGmo,
    skeyGmo: secretAccessKeyGmo,
    LogLevel: isProduction ? 'ERROR' : 'INFO1',
    slackBotToken,
    slackChannelInfo,
    slackChannelError,
  };

  /** ■■Lambda(メインハンドラー)■■ */
  const funcMain = makeLambdaFunc({
    scope,
    id: 'MainHandler' + env,
    codeDirPath,
    handler: 'Handler/main.handler',
    environment: lambdaEnvVariables,
    timeoutSecond: isProduction ? 20 : 10,
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
    codeDirPath,
    handler: 'Handler/Batch/transDynamoData.handler',
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

  /** ■■
   *       Lambda(汎用バッチ)
   *       AWSコンソールの「Test」から実行することを想定し、コンテキストを変えたり状態を変えたりする。
   *       将来的にはAPI & クライアントアプリケーションで変更する想定。
   *  ■■ */
  const funcUtilBatch = makeLambdaFunc({
    scope,
    id: 'UtilBatch' + env,
    codeDirPath,
    handler: 'Handler/Batch/utilBatch.handler',
    environment: lambdaEnvVariables,
    timeoutSecond: 60,
    memorySize: 1024,
    layersArn: layerArnList,
  });
  s3Bucket.grantReadWrite(funcUtilBatch as any); // なぜか型エラーが出て解決できない。。。苦肉のAs any。
  dynamoTable.grantFullAccess(funcUtilBatch);

  /** ■■Lambda(開発環境用のテストハンドラー)■■ */
  if (!isProduction) {
    const funcDevelopmentTest = makeLambdaFunc({
      scope,
      id: 'DevelopmentTestHandler' + env,
      codeDirPath,
      handler: 'Handler/Batch/developmentTest.handler',
      environment: { ...lambdaEnvVariables, LogLevel: 'TRACE', },
      timeoutSecond: 60,
      memorySize: 1024,
      layersArn: layerArnList,
    });
    dynamoTable.grantFullAccess(funcDevelopmentTest);
  }

  /** ■■API。今のところ開発環境のみ。■■ */
  if (!isProduction) {
    const api = new apiGateway.RestApi(scope, 'vcatApiGateway', {
      restApiName: 'VCAT API',
    });
    const rootResource = api.root.addResource('vcat').addResource('v1').addResource('{productId}');
    const apiGetLive = addApiEndpoint({
      scope, env, codeDirPath, lambdaEnvVariables, layerArnList, dynamoTable, rootResource,
      handlerName: 'getLive',
      apiMethod: 'GET',
      resource: { resourcePath: 'live' },
    });
    const apiGetContext = addApiEndpoint({
      scope, env, codeDirPath, lambdaEnvVariables, layerArnList, dynamoTable, rootResource,
      handlerName: 'getContext',
      apiMethod: 'GET',
      resource: { resourcePath: 'context' },
    });
    const apiPathcContext = addApiEndpoint({
      scope, env, codeDirPath, lambdaEnvVariables, layerArnList, dynamoTable, rootResource,
      handlerName: 'patchContext',
      apiMethod: 'PATCH',
      resource: { existingResource: apiGetContext.resource },
    });
  }

};

type ApiEndpointParams = {
  scope: cdk.Construct,
  handlerName: string,
  env: string,
  codeDirPath: string,
  lambdaEnvVariables: { [key: string]: string; },
  layerArnList: string[],
  dynamoTable: Table,
  rootResource: apiGateway.Resource,
  resource: {
    resourcePath?: string, // API Gatewayのリソースを新規作成する場合は、パスを指定する。
    existingResource?: apiGateway.Resource, // 既存のリソースに新しくメソッドを追加する場合は、既存のリソースを指定する。
  },
  apiMethod: string,
}
/**
 * APIにエンドポイントを追加する。
 */
const addApiEndpoint = (params: ApiEndpointParams) => {
  const { scope, handlerName, env, codeDirPath, lambdaEnvVariables, layerArnList, dynamoTable, rootResource, resource, apiMethod } = params;
  if (!resource.existingResource && !resource.resourcePath) {
    throw new Error('既存のリソースを選択するか、新規作成のリソースパスを指定してください。');
  }
  const apiHandlerLambda = makeLambdaFunc({
    scope,
    id: handlerName + 'Lambda' + env,
    codeDirPath,
    handler: 'Handler/ApiGateway/' + handlerName + '.handler',
    environment: { ...lambdaEnvVariables, },
    timeoutSecond: 3,
    layersArn: layerArnList,
  });
  dynamoTable.grantFullAccess(apiHandlerLambda);
  if (resource.existingResource) { // 既存リソースにメソッド追加
    resource.existingResource.addMethod(apiMethod, new apiGateway.LambdaIntegration(apiHandlerLambda));
    return { apiHandlerLambda, resource: resource.existingResource };
  } else {
    const newResource = rootResource.addResource(resource.resourcePath || ''); // 最初にresourceのattrがどちらも未指定の場合はエラーとしているので、resourcePathがfalsyである可能性は考えない。
    newResource.addMethod(apiMethod, new apiGateway.LambdaIntegration(apiHandlerLambda));
    return { apiHandlerLambda, resource: newResource };
  }
};

const getEnvSettings = () => {
  const accessKeyBitflyer = process.env.AKEY_BITFLYER || '';
  const secretAccessKeyBitflyer = process.env.SKEY_BITFLYER || '';
  const accessKeyGmo = process.env.AKEY_GMO || '';
  const secretAccessKeyGmo = process.env.SKEY_GMO || '';
  const slackBotToken = process.env.SLACK_API_PROD_BOT_AUTH_TOKEN || '';
  const slackChannelProdError = process.env.SLACK_API_PROD_ERRORREPORT_CHANNEL || '';
  const slackChannelProdInfo = process.env.SLACK_API_PROD_INFOREPORT_CHANNEL || '';
  const slackChannelDevError = process.env.SLACK_API_DEV_ERRORREPORT_CHANNEL || '';
  const slackChannelDevInfo = process.env.SLACK_API_DEV_INFOREPORT_CHANNEL || '';
  const awsLayerArnList = process.env.AWS_LAYER_ARN_LIST || '';

  const obj = { accessKeyBitflyer, secretAccessKeyBitflyer, accessKeyGmo, secretAccessKeyGmo, slackBotToken, slackChannelProdError, slackChannelProdInfo, slackChannelDevError, slackChannelDevInfo, awsLayerArnList, };

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
    retryAttempts: 0,
  });

  if (params.schedule) {
    const rule = new events.Rule(scope, params.schedule.id, {
      schedule: events.Schedule.cron(params.schedule.cron),
    });
    rule.addTarget(new targets.LambdaFunction(func));
  }

  return func;
};
