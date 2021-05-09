import * as AWS from 'aws-sdk'

const s3 = new AWS.S3();

/**
 * 既定のS3バケットにテキストファイルを作成し、データを保存する。
 * @param filePath ファイルパス。「directory/hoge.txt」のようにフォルダ名を含むこともできる。重複時は多分上書きだけど、保証しないので、重複しないように指定すること。
 * @param body ファイルに書き込む文字列。
 * @returns 失敗した場合はfalse。
 */
 export const writeTextFile = async (filePath: string, body: string) => {
  const bucketName = process.env.BucketName || ''
  try {
    return await s3.putObject({
      Bucket: bucketName, Key: filePath, Body: body,
    }).promise();
  } catch (err) {
    console.error(`error: ${JSON.stringify(err)}`);
    return false;
  }
};
