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
