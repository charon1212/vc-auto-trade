import * as readline from 'readline';

/**
 * コマンドラインに質問を投げてユーザー入力を待機し、その結果に応じて処理を実施する。
 * @param question コマンドラインに出力する質問。
 * @param onAnswered ユーザーが入力した内容をもとに実施する処理。
 * @param onclose 質問を閉じた後の処理。
 */
export const confirmCommandLine = (question: string, onAnswered: (answer: string) => void, onclose: () => void) => {

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(question, (ans) => {
    onAnswered(ans);
    rl.close();
  });

  rl.on('close', onclose);

};