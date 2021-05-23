import { Response } from "node-fetch";
import handleError from "../../../HandleError/handleError";
import { Pagination } from "./type";

export const convertPaginationToString = (pagination?: Pagination) => {
  if (pagination) {
    return {
      count: pagination.count?.toString(),
      before: pagination.before?.toString(),
      after: pagination.after?.toString(),
    };
  } else {
    return undefined;
  }
};

/**
 * HTTP Status が200系でない場合、エラー処理を実施する。
 * @param response HTTP Response。
 * @returns 200系の場合はtrue、そうでない場合はfalse。
 */
export const checkHttpStatus = async (response: Response) => {
  if (!response.ok) {
    await handleError(__filename, 'checkHttpStatus', 'code', 'API通信で200以外の応答', { response, },);
    return false;
  }
  return true;
};
