#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { VcAutoTradeStack } from '../lib/vc-auto-trade-stack';
import { VcAutoTradeStackDev } from '../lib/vc-auto-trade-stack-dev';

const isProductionBuild = process.env.ENV_NAME === 'production';
if (isProductionBuild) {
  console.log(`■■■■■■■■■■■■■■■■■■■■
■■■■■■■■■■■■■■■■■■■■
■■注意！　本番環境用のデプロイです■■
■■■■■■■■■■■■■■■■■■■■
■■■■■■■■■■■■■■■■■■■■`);
} else {
  console.log('■■開発環境デプロイ■■');
}

const params = {};

const app = new cdk.App();

if (isProductionBuild) {
  new VcAutoTradeStack(app, 'VcAutoTradeStack', params);
} else {
  new VcAutoTradeStackDev(app, 'VcAutoTradeStackDev', params);
}

/** もともとあった、paramsの説明をここに残す。 */
/* If you don't specify 'env', this stack will be environment-agnostic.
 * Account/Region-dependent features and context lookups will not work,
 * but a single synthesized template can be deployed anywhere. */

/* Uncomment the next line to specialize this stack for the AWS Account
 * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

/* Uncomment the next line if you know exactly what Account and Region you
 * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

/* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
