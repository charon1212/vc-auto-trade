/**
 * エラーハンドリング
 * @param code エラーコード。
 * @param msg エラーメッセージ
 * @param err try-catchで発生したエラーの場合、スローした例外。
 */
const handleError = (code?: string, msg?: string, err?: any) => {
  console.error(`msg: ${msg}`);
};

export default handleError;