export type ApiRequestEvent = {
  resource: string,
  path: string,
  httpMethod: 'GET' | 'POST' | 'PATCH',
  headers: { [key: string]: string },
  pathParameters: { [key: string]: string },
  queryStringParameters: { [key: string]: string },
  body: string,
};
export type ApiResponse = {
  isBase64Encoded: boolean,
  statusCode: number,
  headers: { [key: string]: string },
  body: string,
};