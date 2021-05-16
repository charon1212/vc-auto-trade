export const processEnv = {
  TableName: process.env.TableName || '', // 利用するDynamoDBのテーブル名
  EnvName: process.env.EnvName || 'dev', // デプロイした環境の種類を表す名前。開発環境は'dev'、本番環境は'production'。
  AKEY: process.env.AKEY || '', // Bitflyer APIのアクセスキー
  SKEY: process.env.SKEY || '', // Bitflyer APIのシークレットアクセスキー
  LogLevel: process.env.LogLevel || '', // ログレベル
  slackBotToken: process.env.slackBotToken || '', // Slackボットの認証トークン
  slackChannelInfo: process.env.slackChannelInfo || '', // Slackのチャンネル(Info用)
  slackChannelError: process.env.slackChannelError || '', // Slackのチャンネル(Error用)
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
