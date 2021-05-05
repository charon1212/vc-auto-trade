/**
 * エラーハンドリング
 * @param code エラーコード。
 * @param msg エラーメッセージ
 * @param err try-catchで発生したエラーの場合、スローした例外。
 */
const handleError = (code?: string, msg?: string, err?: any) => {
  let output = `■エラーメッセージ：${msg}`;
  if (err) output += `■エラー内容：${JSON.stringify(err)}`;
  console.error(output);
};

export default handleError;