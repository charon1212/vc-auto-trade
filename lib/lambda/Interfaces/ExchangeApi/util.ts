export const convertQueryParamsToStr = (queryParams?: { [key: string]: string | undefined }) => {

  let path = '';
  if (queryParams) {
    const queryParamSets: string[] = [];
    for (let key in queryParams) {
      if (queryParams[key] !== undefined) queryParamSets.push(key + '=' + queryParams[key]);
    }
    if (queryParamSets.length > 0) path += '?' + queryParamSets.join('&');
  }
  return path;

};