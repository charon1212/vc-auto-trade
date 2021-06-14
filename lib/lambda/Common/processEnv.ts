import { VCATLogLevel } from "./log";

type EnvName = 'production' | 'dev';
export type ProcessEnv = {
  TableName: string,
  EnvName: 'production' | 'dev',
  BucketName: string,
  akeyBitflyer: string,
  skeyBitflyer: string,
  akeyGmo: string,
  skeyGmo: string,
  LogLevel: VCATLogLevel,
  slackBotToken: string,
  slackChannelInfo: string,
  slackChannelError: string,
}

export const processEnv: ProcessEnv = {
  TableName: process.env.TableName || '', // 利用するDynamoDBのテーブル名
  EnvName: (process.env.EnvName || 'dev') as EnvName, // デプロイした環境の種類を表す名前。開発環境は'dev'、本番環境は'production'。
  akeyBitflyer: process.env.akeyBitflyer || '', // Bitflyer APIのアクセスキー
  skeyBitflyer: process.env.skeyBitflyer || '', // Bitflyer APIのシークレットアクセスキー
  akeyGmo: process.env.akeyGmo || '', // Gmo APIのアクセスキー
  skeyGmo: process.env.skeyGmo || '', // Gmo APIのシークレットアクセスキー
  LogLevel: (process.env.LogLevel || 'TRACE') as VCATLogLevel, // ログレベル
  slackBotToken: process.env.slackBotToken || '', // Slackボットの認証トークン
  slackChannelInfo: process.env.slackChannelInfo || '', // Slackのチャンネル(Info用)
  slackChannelError: process.env.slackChannelError || '', // Slackのチャンネル(Error用)
  BucketName: process.env.BucketName || '', // S3バケット名
};

/**
 * 全ての環境変数に値が割り当てられていることを確認する。
 * @returns 環境変数のいずれかの値にFalsyな値(空文字、0、false、null、undefined等)があるとtrue、なければfalse。
 */
export const hasEmptyProcessEnvParam = () => {
  for (let envParam of Object.values(processEnv)) {
    if (!envParam) return true;
  }
  return false;
};
