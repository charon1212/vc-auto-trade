/**
 * 対象オブジェクトが、値がNaNのnumber型属性を有するか判定する。
 * 判定は1階層のみ実施する。「obj.att1.att2」がNaNであっても、無視する。
 *
 * @param obj 対象のオブジェクト。
 * @returns NaNを持つ場合はtrue、そうでない場合はfalse。
 */
export const hasNanAttribute = (obj: any) => {
  for (let attr in obj) {
    const value = obj[attr];
    if (typeof value === 'number' && Number.isNaN(value)) return true;
  }
  return false;
};

export const hasNanAttributeList = (list: any[]) => {
  for (let item of list) if (hasNanAttribute(item)) return true;
  return false;
};