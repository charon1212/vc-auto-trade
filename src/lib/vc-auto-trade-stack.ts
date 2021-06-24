import * as cdk from '@aws-cdk/core';
import { stackConstructor } from './stackConstructor';

/**
 * 本番環境用
 */
export class VcAutoTradeStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    stackConstructor(this, '');

  }
}
