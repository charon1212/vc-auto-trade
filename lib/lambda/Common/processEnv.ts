export const processEnv = {
  TableName: process.env.TableName || '', // 利用するDynamoDBのテーブル名
  EnvName: process.env.EnvName || 'dev', // デプロイした環境の種類を表す名前。開発環境は'dev'、本番環境は'production'。
  AKEY: process.env.AKEY || '', // Bitflyer APIのアクセスキー
  SKEY: process.env.SKEY || '', // Bitflyer APIのシークレットアクセスキー
  LogLevel: process.env.LogLevel || '', // ログレベル
};